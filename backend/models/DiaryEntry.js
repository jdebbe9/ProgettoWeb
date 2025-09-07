const mongoose = require('mongoose');

const ALLOWED_EMOTIONS = [
  'gioia', 'tristezza', 'rabbia', 'ansia', 'paura', 'calma', 'sorpresa', 'disgusto',
  'amore', 'gratitudine', 'frustrazione', 'solitudine', 'speranza', 'colpa',
  'vergogna', 'orgoglio', 'eccitazione', 'sollievo', 'noia', 'confusione'
];

const DiaryEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Testo facoltativo (max 5000)
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },

    // Visibilità (mantengo il campo che avevi già)
    shared: {
      type: Boolean,
      default: true,
      index: true,
    },

    // NUOVO: stato d’animo 1..5 (stile Salute)
    mood: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
      index: true,
    },

    // NUOVO: elenco emozioni (validate via enum)
    emotions: [
      {
        type: String,
        enum: ALLOWED_EMOTIONS,
      },
    ],
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Indice consigliato per query per utente e ordine cronologico
DiaryEntrySchema.index({ user: 1, createdAt: -1 });

// Esporta il Model e, come comodo, anche la lista delle emozioni consentite
const DiaryEntry = mongoose.model('DiaryEntry', DiaryEntrySchema);
DiaryEntry.ALLOWED_EMOTIONS = ALLOWED_EMOTIONS;

module.exports = DiaryEntry;

