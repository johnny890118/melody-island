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
  home-moonlight: '#f4d2a8'
  home-sky: '#262039'
typography:
  display:
    fontFamily: 'Cormorant, Georgia, serif'
    fontSize: 'clamp(68px, 8vw, 96px)'
    fontWeight: 400
    lineHeight: 0.87
    letterSpacing: '-0.035em'
  body:
    fontFamily: 'Manrope, PingFang TC, sans-serif'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.7
  home-display:
    fontFamily: 'Cormorant, Georgia, serif'
    fontSize: 'clamp(72px, 8.2vw, 96px)'
    fontWeight: 500
    lineHeight: 0.83
    letterSpacing: '-0.039em'
  home-display-mobile:
    fontFamily: 'Cormorant, Georgia, serif'
    fontSize: 'clamp(60px, 19vw, 83px)'
    fontWeight: 500
    lineHeight: 0.83
    letterSpacing: '-0.039em'
rounded:
  control: '4px'
  video: '8px'
  dialog: '12px'
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
    padding: '15px 20px'
    height: '52px'
  home-button-create:
    backgroundColor: '{colors.home-paper}'
    textColor: '{colors.home-ink}'
    rounded: '{rounded.control}'
    padding: '15px 20px'
    height: '52px'
---

# Design System: Melody Island

## Overview

**Creative North Star: A place between songs.** A small, tangible island framed as an open listening postcard. The homepage is an Experience surface; the listening room is Operate. Awwwards-level craft is the ambition, not a claim of an award or completed external evaluation.

An independent finish review of the first implemented design candidate scored five concrete corrections resolved, including framing, entry flow, mobile hierarchy, placeholder contrast and focused transport clearance. That review is narrower than overall award quality.

**Moon Pass** is the internal name of visual direction 06. Melody Island is the public brand and homepage title. The original miniature island passes in front of a rose-gold moon, with the original phoenix and an orbital ellipse giving the scene scale and direction. The listening room shares the palette and uses a restrained night gradient so playback, queue and search stay easy to scan.

## Colors

Midnight plum is the continuous ground. Lunar ivory carries text, and warm moonlight marks focus, playback and the selected track. Muted text stays at full opacity. Fine rules organize content without nested cards or decorative glass.

Moon Pass uses a midnight plum sky and lunar ivory text. Warm moonlight highlights the italic title line, focus and filled boarding action. Muted mauve carries supporting copy.

## Typography

Self-hosted Cormorant Garamond and Manrope use WOFF2 under OFL. Traditional Chinese uses the system's Chinese face. Display text is fluid and capped at 96px; operational text remains compact and legible. Do not use the display serif for long instructions or force English where Chinese makes an action clearer.

The homepage stacks the Melody Island wordmark in Cormorant, with an italic second line. The global navigation pairs the brand with the account action and leaves the center open. The introduction, scene instructions and entry actions use Traditional Chinese.

## Layout

Desktop keeps navigation, editorial title, substantial full-island silhouette and primary actions in an open field. At 900px and 560px the composition reflows; short screens scroll naturally. Mobile keeps the real 3D scene before actions. In the room, now-playing leads, followed by queue and search; members and permissions sit in collapsed secondary management.

The transport is fixed. Document scroll padding and control scroll margins preserve focus above it, verified at 390×600. Maintain bottom clearance when adding controls.

On the Moon Pass homepage, the island fills the upper and right field, the title sits at lower left, and the boarding actions sit at lower right. At 900px the stage takes more of the available width. At 560px the page flows from island and scene controls to title, full-width actions, status and credits. Give the caption and its longer status text their own space clear of the title and boarding actions.

## Elevation & Depth

The real model supplies depth. Application surfaces remain flat and use rules to separate content. The modal overlay protects input focus; it is not decorative glass. Do not add neon halos, invented texture or bevelled controls.

Moon Pass places a rose-gold disc and a thin orbital ellipse behind the real model. Keep the lunar edge readable while preserving the island's full silhouette and the contrast of nearby controls.

## Shapes

Controls use 4px corners, video 8px, dialogs 12px. Circular icon controls have at least 44px targets. The thin orbit belongs to the scene; it is not a reusable card ornament.

## Components

Use local shadcn/ui primitives in `components/ui` for controls and dialogs, with Lucide icons only. Radix is the internal accessibility foundation of these wrappers; application code imports the local wrappers. The visual tokens below override stock styling. Native semantic elements and the Three.js scene remain appropriate.

Primary controls use warm moonlight or lunar ivory with midnight text. Secondary actions use the dark ground and a light rule. Focus uses a 2px moonlight outline with a 5px offset. Every asynchronous action has disabled/loading/error feedback. Forms have actual labels, not only placeholders.

The real Canvas uses bounded DPR and stops rendering while the tab is hidden. Idle orbit respects reduced motion. Drag and canvas-scoped arrow keys change the view, and reset restores the full island. WebGL/load failure has a clear fallback without removing room access.

The filled Moon Pass action boards a friend's island. The outlined action follows the user's sign-in and island state. The homepage uses the moonlight accent for the same focus outline geometry as the shared controls.

The homepage loads the island first and adds the phoenix after the island is ready. The bird supplies scale and can fail independently. The scene's pause control stops automatic motion while leaving manual rotation available. With reduced motion, the phoenix and island start still. Touch users can scroll vertically through the scene. The footer credits both models.

## Do's and Don'ts

- Keep the interactive island central and the complete miniature silhouette readable.
- Preserve quiet space, honest connection states and clear Chinese action labels.
- Keep mock-player captures explicitly labelled as test evidence.
- Do not fabricate active users, listening counts, testimonials or perfect synchronization.
- Do not introduce large blur layers, card grids or progress decoration unrelated to actual state.
