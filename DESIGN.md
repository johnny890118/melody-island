---
name: Melody Island
description: A private place between songs, centered on a real interactive island.
colors:
  paper: '#f4f0e8'
  ink: '#183c35'
  muted: '#56665c'
  accent: '#c34b30'
  rule: '#cecfc1'
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
---

# Design System: Melody Island

## Overview

**Creative North Star: A place between songs.** A small, tangible island suspended over a warm sea, framed as an open listening postcard. The homepage is an Experience surface; the listening room is Operate. Awwwards-level craft is the ambition, not a claim of an award or completed external evaluation.

This is the first implemented design candidate. An independent finish review scored five concrete corrections resolved, including framing, entry flow, mobile hierarchy, placeholder contrast and focused transport clearance. That review is narrower than overall award quality.

## Colors

Warm ivory is the continuous ground, sea-green ink carries text and controls, and vermilion is reserved for the headline emphasis and selected state. Muted text stays at full opacity. Fine rules organize content without nested cards or decorative glass.

## Typography

Self-hosted Cormorant Garamond and Manrope use WOFF2 under OFL. Traditional Chinese uses the system's Chinese face. Display text is fluid and capped at 96px; operational text remains compact and legible. Do not use the display serif for long instructions or force English where Chinese makes an action clearer.

## Layout

Desktop keeps navigation, editorial title, substantial full-island silhouette and primary actions in an open field. At 900px and 560px the composition reflows; short screens scroll naturally. Mobile keeps the real 3D scene before actions. In the room, now-playing leads, followed by queue and search; members and permissions sit in collapsed secondary management.

The transport is fixed. Document scroll padding and control scroll margins preserve focus above it, verified at 390×600. Maintain bottom clearance when adding controls.

## Elevation & Depth

The real model supplies depth. Application surfaces remain flat and use rules to separate content. The modal overlay protects input focus; it is not decorative glass. Do not add neon halos, invented texture or bevelled controls.

## Shapes

Controls use 4px corners, video 8px, dialogs 12px. Circular icon controls have at least 44px targets. The thin orbit belongs to the scene; it is not a reusable card ornament.

## Components

Primary actions are sea-green with ivory text; secondary actions use the paper ground and an ink rule. Focus is a 2px vermilion outline with 5px offset. Every asynchronous action has disabled/loading/error feedback. Forms have actual labels, not only placeholders.

The real Canvas uses bounded DPR and stops rendering while the tab is hidden. Idle orbit respects reduced motion. Drag and canvas-scoped arrow keys change the view, and reset restores the full island. WebGL/load failure has a clear fallback without removing room access.

## Do's and Don'ts

- Keep the interactive island central and the complete miniature silhouette readable.
- Preserve quiet space, honest connection states and clear Chinese action labels.
- Keep mock-player captures explicitly labelled as test evidence.
- Do not fabricate active users, listening counts, testimonials or perfect synchronization.
- Do not introduce large blur layers, card grids or progress decoration unrelated to actual state.
