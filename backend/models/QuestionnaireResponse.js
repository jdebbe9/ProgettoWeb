const mongoose = require('mongoose');

const QAItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 200 },
    answer:   { type: String, required: true, trim: true, maxlength: 2000 }
  },
  { _id: false }
);

const QuestionnaireResponseSchema = new mongoose.Schema(
  {
    // un solo questionario per utente
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // array di Q/A coerente con il controller
    responses: { type: [QAItemSchema], required: true }
  },
  { timestamps: true }  // usa createdAt/updatedAt invece di submittedAt
);


module.exports = mongoose.model('QuestionnaireResponse', QuestionnaireResponseSchema);

