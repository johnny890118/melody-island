---
name: Melody Island
description: A private place between songs, centered on a real interactive island.
colors:
  paper: '#171321'
  ink: '#f5ecdc'
  muted: '#d6c1ce'
  accent: '#ffc991'
  rule: '#a78d9c'
  surface: '#211a2e'
  hover: '#372b42'
  error: '#ffad9e'
  home-paper: '#171321'
  home-ink: '#f5ecdc'
  home-muted: '#d6c1ce'
  home-accent: '#ffc991'
  home-rule: '#a78d9c'
  home-background: '#0d0c17'
typography:
  display:
    fontFamily: 'Cormorant, PingFang TC, serif'
    fontSize: '40px'
    fontWeight: 500
    letterSpacing: '-0.025em'
  body:
    fontFamily: 'Manrope, PingFang TC, sans-serif'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.7
  home-display:
    fontFamily: 'Cormorant, Georgia, serif'
    fontSize: 'clamp(72px, 8.2vw, 96px)'
    fontWeight: 500
    lineHeight: 0.87
    letterSpacing: '-0.039em'
  home-display-mobile:
    fontFamily: 'Cormorant, Georgia, serif'
    fontSize: 'clamp(60px, 19vw, 83px)'
    fontWeight: 500
    lineHeight: 0.87
    letterSpacing: '-0.039em'
rounded:
  control: '4px'
  video: '8px'
  dialog: '12px'
  search-sheet: '16px 16px 0 0'
spacing:
  small: '8px'
  medium: '16px'
  large: '24px'
  section: '44px'
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    rounded: '{rounded.control}'
    padding: '15px 20px'
    height: '52px'
  home-button-board:
    backgroundColor: '{colors.home-accent}'
    textColor: '{colors.home-paper}'
    rounded: '{rounded.control}'
    padding: '15px 18px'
    height: '52px'
  home-button-create:
    backgroundColor: '{colors.home-paper}'
    textColor: '{colors.home-ink}'
    rounded: '{rounded.control}'
    padding: '15px 18px'
    height: '52px'
---

# Design System: Melody Island

## Overview

**Creative North Star: A place between songs.** A small, tangible island framed as an open listening postcard. The homepage is an Experience surface; the listening room is Operate. Awwwards-level craft is the ambition, not a claim of an award or completed external evaluation.

An independent finish review of the first implemented design candidate scored five concrete corrections resolved, including framing, entry flow, mobile hierarchy, placeholder contrast and focused transport clearance. That review is narrower than overall award quality.

**Moon Pass** is the internal name of visual direction 06. Melody Island is the public brand and homepage title. The owner selected the Lunar Approach composition on 2026-11-05: the original miniature island floats in the foreground while a shaded moon recedes beyond the upper-right edge. The original phoenix remains a real animated model. There is no decorative orbital line. The listening room shares the night palette while prioritizing video, queue and local listening state.

## Colors

Midnight plum is the shared application ground; the homepage extends it with a deeper night background. Lunar ivory carries text, and warm moonlight marks focus, playback and the selected track. Muted text stays at full opacity. Fine rules organize content without nested cards or decorative glass.

Moon Pass pairs the deeper homepage sky with lunar ivory text. Warm moonlight highlights the italic title line, focus and filled boarding action. Muted mauve carries supporting copy.

## Typography

Self-hosted Cormorant Garamond and Manrope use WOFF2 under OFL. Traditional Chinese uses the system's Chinese face. Homepage display text is fluid and capped at 96px; operational text remains compact and legible. Do not use the display serif for long instructions or force English where Chinese makes an action clearer.

The homepage stacks the Melody Island wordmark in Cormorant, with an italic second line. The global navigation pairs the brand with the account action and leaves the center open. The introduction, scene instructions and entry actions use Traditional Chinese. Room track titles use the readable UI family, including long Chinese titles; the display serif distinguishes the homepage and short room headings.

## Layout

Desktop keeps navigation, editorial title, substantial full-island silhouette and primary actions in an open field. At 1000px and 560px the composition reflows; short screens scroll naturally. Mobile keeps the real 3D scene before actions. In the room, now-playing leads, followed by queue and intentional search; members and permissions sit in collapsed secondary management.

The transport is fixed. Document scroll padding and control scroll margins preserve focus above it, verified at 390×600. Maintain bottom clearance when adding controls.

On the Lunar Approach homepage, the island occupies the middle/right foreground. Title, left-aligned tagline and boarding actions form one left-hand group. Join is the primary action, followed by create or return-to-island. At intermediate widths the entry group moves below the scene. At 560px the page flows from island and scene controls to title and full-width actions; short screens scroll naturally. The moon may crop, while the full island remains readable.

The room uses a larger video column and a narrower shared queue on desktop, then a single column below 760px. Queue rows carry order and a textual playing marker. Add-song opens a focused local shadcn dialog, presented as a bottom sheet on mobile; closing returns focus to the add-song control. Search loading, errors and no-results appear inside that surface. Room-wide playback and this device's sound state use distinct copy. Mobile transport preserves current-song and shared-state context, without introducing a new seek command.

## Elevation & Depth

The real model supplies depth. Application surfaces remain flat and use rules to separate content. The modal overlay protects input focus; it is not decorative glass. Do not add neon halos, invented texture or bevelled controls.

Lunar Approach uses the existing NASA lunar texture with directional shading and a cropped celestial scale. A warm rear key and cooler front fill connect the original low-poly island to its night setting. Keep the lunar edge readable while preserving the island's full silhouette and the contrast of nearby controls. The room does not add a continuous 3D canvas.

## Shapes

Controls use 4px corners, video 8px, desktop dialogs 12px. The mobile song-search sheet has 16px top corners and square bottom corners. Circular icon controls have at least 44px targets. Scene-animation controls may expand to include a label, without compressing adjacent targets.

## Components

Use local shadcn/ui primitives in `components/ui` for controls and dialogs, with Lucide icons only. Radix is the internal accessibility foundation of these wrappers; application code imports the local wrappers. The visual tokens below override stock styling. Native semantic elements and the Three.js scene remain appropriate.

Primary controls use warm moonlight or lunar ivory with midnight text. Secondary actions use the dark ground and a light rule. Focus uses a 2px moonlight outline with a 5px offset. Every asynchronous action has disabled/loading/error feedback. Forms have actual labels, not only placeholders.

The real Canvas uses bounded DPR and stops rendering while the tab is hidden or the scene is outside the viewport. Idle orbit respects reduced motion. Drag and canvas-scoped arrow keys change the view, and reset restores the full island. WebGL/load failure has a clear fallback without removing room access.

The filled Moon Pass action boards a friend's island. The outlined action follows the user's sign-in and island state. The homepage uses the moonlight accent for the same focus outline geometry as the shared controls.

The homepage loads the island first and adds the phoenix after the island is ready. The bird supplies scale and can fail independently. The scene's pause control stops automatic motion while leaving manual rotation available. With reduced motion, the phoenix and island start still. Touch users can scroll vertically through the scene. The footer credits both models.

## Do's and Don'ts

- Keep the interactive island central and the complete miniature silhouette readable.
- Preserve quiet space, honest connection states and clear Chinese action labels.
- Keep mock-player captures explicitly labelled as test evidence.
- Do not fabricate active users, listening counts, testimonials or perfect synchronization.
- Do not introduce large blur layers, card grids or progress decoration unrelated to actual state.

## Room transport activation

Playback actions stay in the fixed bottom transport. When a playing room needs this device's first listening gesture, a labelled moonlight “開始聆聽” action occupies the transport's local-status slot and becomes a full-width row on mobile. Shared play/pause/skip and local mute remain separate and available according to their existing permissions. The in-page notice points to that action; no second activation button is hidden below the player. Extra scroll/focus clearance applies while the mobile activation row is present.

YouTube's supported player parameters hide its normal control strip and disable its keyboard shortcuts/fullscreen control. Preserve YouTube branding, required links and advertisements; do not cover the embedded player with a click-blocking overlay. This is functional hardening within direction 06, not a new visual direction.

## Approved room A — 2026-11-07

The owner retains the incumbent homepage scene/composition, with only the tagline left-aligned to its title. Actions are「加入島嶼」plus「開闢島嶼」or「我的島嶼」according to account/ownership state; login remains available in navigation and as the create action's prerequisite. Do not apply any alternative homepage prototype.

Room A is the listening deck: real unobscured YouTube/current song left, shared queue right, fixed transport below. The top member strip represents joined membership, not online presence. Its local shadcn dialog separates member recognition and owner-only permission/transfer/removal controls from everyday listening. Dialogs return focus to their actual triggers. Queue lists subsequent songs first, then a labelled current/other group; this display ordering neither rewrites the canonical playlist nor implies playback history. Shuffle copy explains that the next track is selected from the playlist. All original select/remove actions remain available by stable video ID.

Real player lifecycle and room timeline are unchanged. Local device readiness/activation/mute copy is adjacent to the song and transport; errors remain actionable. Mobile clears the optional activation row and retains44px control targets at320px. Existing brand tokens, local components, model assets and typography remain authoritative; this is an approved layout extension, not a new identity or token system.
