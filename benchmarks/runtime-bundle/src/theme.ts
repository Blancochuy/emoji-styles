// Benchmark fixture from CLI draft at 0a1a662, not a reviewed product theme.
// DRAFT: review every token, label and meaning before integrating. No source files were migrated.
// Unresolved status conflicts and artwork choices are omitted. See review.json.
import { defineEmojiTheme } from "emoji-styles";

export const emojiTheme = defineEmojiTheme({
  "content.pricing": {
    "emoji": "🚀",
    "label": "Pricing",
    "decorative": false
  },
  "action.deploy": {
    "emoji": "🚀",
    "label": "Deploy",
    "decorative": false
  },
  "status.success": {
    "emoji": "✅",
    "label": "Success",
    "decorative": false
  },
  "action.review": {
    "emoji": "⚙️",
    "label": "REVIEW: name this control",
    "decorative": false
  },
  "action.configuracion": {
    "emoji": "⚙️",
    "label": "Configuración",
    "decorative": false
  },
  "action.anadir.cuenta": {
    "emoji": "➕",
    "label": "Añadir cuenta",
    "decorative": false
  },
  "status.warning": {
    "emoji": "⚠️",
    "label": "Warning",
    "decorative": false
  },
  "action.inicio": {
    "emoji": "🏠",
    "label": "Inicio",
    "decorative": false
  },
  "action.abrir.ajustes": {
    "emoji": "⚙️",
    "label": "Abrir ajustes",
    "decorative": false
  },
  "action.review2": {
    "emoji": "🗑️",
    "label": "REVIEW: name this control",
    "decorative": false
  },
  "status.notificaciones": {
    "emoji": "🔔",
    "label": "notificaciones",
    "decorative": false
  },
  "content.popular": {
    "emoji": "🔥",
    "label": "Popular",
    "decorative": false
  }
}, {
  "id": "review-draft",
  "version": "1.0.0",
  "defaultProvider": "fluent-3d",
  "fallbacks": [
    "twemoji"
  ],
  "nativeFallback": false
});
