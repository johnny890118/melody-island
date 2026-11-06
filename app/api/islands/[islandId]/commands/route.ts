import { parseCommand, record } from '@/lib/validation';
import { errorCode } from '@/lib/errors';
import type { RouteContext } from '@/lib/types';
import { requireRoom } from '@/lib/server/room';
import { adminServices } from '@/lib/server/firebase';
import { authenticate, failure, rateLimit, readBody } from '@/lib/server/http';
import { applyCommand, assertRoomId, SessionError } from '@/lib/session';
import { contentDuration } from '@/lib/server/media';
import { createHash } from 'node:crypto';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const actor = await authenticate(request);
    const { islandId } = await params;
    assertRoomId(islandId);
    const command = parseCommand(await readBody(request));
    const fingerprint = createHash('sha256').update(JSON.stringify(command)).digest('hex');
    const commandId = command.commandId;
    if (typeof commandId !== 'string' || !/^[a-zA-Z0-9-]{10,80}$/.test(commandId))
      throw new SessionError('操作識別碼不正確。');
    await rateLimit(actor.uid, 'command', 120);
    const { db } = adminServices();
    const roomRef = db.doc(`islands/${islandId}`);
    let admittedDuration: number | undefined;
    let admittedVideo: string | undefined;
    // Resolve provider metadata outside transaction retries; never accept client duration.
    // Membership is checked before spending provider quota and again atomically below.
    if (command.type === 'add' || command.type === 'ended' || command.type === 'advance' || command.type === 'play') {
      const [snapshot, previous] = await db.getAll(roomRef, roomRef.collection('commands').doc(commandId));
      const current = requireRoom(snapshot);
      if (!current.memberUids.includes(actor.uid)) throw new SessionError('請先加入這座島嶼。', 403);
      if (previous.exists) {
        const receipt = record(previous.data());
        if (receipt.uid !== actor.uid || (receipt.fingerprint !== undefined && receipt.fingerprint !== fingerprint))
          throw new SessionError('操作識別碼已被使用。', 409);
        if (typeof receipt.version !== 'number') throw new SessionError('操作紀錄不完整。', 409);
        return Response.json({ version: receipt.version });
      }
      if (command.type === 'add') {
        if (current.ownerUid !== actor.uid && !current.permissions.guestsCanEditQueue)
          throw new SessionError('你目前沒有這項操作權限。', 403);
        command.song.durationMs = await contentDuration(command.song.videoId);
      } else if (command.type === 'play') {
        if (current.ownerUid !== actor.uid && !current.permissions.guestsCanControlPlayback)
          throw new SessionError('你目前沒有這項操作權限。', 403);
        // Repeated play remains a no-op independent of provider availability.
        // A first legacy resume must know if its frozen position is terminal.
        const song = current.playlist.find(item => item.videoId === (current.currentVideo || current.playlist[0]?.videoId));
        if (!current.isPlaying && song && song.durationMs === undefined) {
          admittedVideo = song.videoId;
          admittedDuration = await contentDuration(song.videoId);
        }
      } else if (command.type === 'ended' || command.type === 'advance') {
        if (!current.isPlaying || command.videoId !== current.currentVideo)
          throw new SessionError('播放狀態已更新，請再試一次。', 409);
        if (command.type === 'ended' && current.ownerUid !== actor.uid && !current.permissions.guestsCanSkip)
          throw new SessionError('目前由島主管理自動切歌。', 403);
        admittedVideo = command.videoId;
        admittedDuration = current.playlist.find(song => song.videoId === command.videoId)?.durationMs
          ?? await contentDuration(command.videoId);
      }
    }
    if (command.type === 'lease') {
      const current = await roomRef.get();
      const data = requireRoom(current);
      if (!data.memberUids.includes(actor.uid)) throw new SessionError('請先加入這座島嶼。', 403);
      const patch = applyCommand(data, command, actor);
      if (Object.keys(patch).length) {
        try {
          await roomRef.update(patch, { lastUpdateTime: current.updateTime });
        } catch (error) {
          if (![9, 10].some((code) => code === errorCode(error))) throw error;
        }
      }
      return Response.json({ version: data.version });
    }
    const result = await db.runTransaction(
      async (transaction) => {
        const [room, previous] = await transaction.getAll(
          roomRef,
          roomRef.collection('commands').doc(commandId),
        );
        const data = requireRoom(room);
        if (!data.memberUids.includes(actor.uid)) throw new SessionError('請先加入這座島嶼。', 403);
        if (previous.exists) {
          const receipt = record(previous.data());
          if (typeof receipt.version !== 'number') throw new SessionError('操作紀錄不完整。', 409);
          if (receipt.uid !== actor.uid) throw new SessionError('操作識別碼已被使用。', 409);
          if (receipt.fingerprint !== undefined && receipt.fingerprint !== fingerprint)
            throw new SessionError('同一個操作識別碼不能用於不同的指令。', 409);
          return { version: receipt.version };
        }
        const prepared = admittedDuration === undefined ? data : {
          ...data, playlist: data.playlist.map(song => song.videoId === admittedVideo
            ? { ...song, durationMs: admittedDuration } : song),
        };
        const patch = applyCommand(prepared, command, actor);
        const version = patch.version ?? data.version;
        if (Object.keys(patch).length) transaction.update(roomRef, {
          ...patch,
          // Persist admitted legacy metadata with the normal command, so a later
          // explicit replay can recognize the terminal position and start at zero.
          ...(admittedDuration !== undefined && !patch.playlist &&
            data.playlist.some(song => song.videoId === admittedVideo && song.durationMs === undefined)
            ? { playlist: prepared.playlist } : {}),
        });
        transaction.create(roomRef.collection('commands').doc(commandId), {
          uid: actor.uid,
          version,
          createdAt: Date.now(),
          fingerprint,
        });
        return { version };
      },
      { maxAttempts: 10 },
    );
    return Response.json(result);
  } catch (error) {
    return failure(error);
  }
}
