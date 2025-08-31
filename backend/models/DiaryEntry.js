const mongoose = require('mongoose');

const DiaryEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    shared:  { type: Boolean, default: true, index: true },
    // niente "date": usiamo createdAt fornito da timestamps
  },
  { timestamps: true }
);


module.exports = mongoose.model('DiaryEntry', DiaryEntrySchema);

