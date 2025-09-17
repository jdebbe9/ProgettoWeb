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


    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },

   
    shared: {
      type: Boolean,
      default: true,
      index: true,
    },

 
    mood: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
      index: true,
    },

   
    emotions: [
      {
        type: String,
        enum: ALLOWED_EMOTIONS,
      },
    ],
  },
  {
    timestamps: true, 
  }
);


DiaryEntrySchema.index({ user: 1, createdAt: -1 });


const DiaryEntry = mongoose.model('DiaryEntry', DiaryEntrySchema);
DiaryEntry.ALLOWED_EMOTIONS = ALLOWED_EMOTIONS;

module.exports = DiaryEntry;

