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
   
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
    responses: { type: [QAItemSchema], required: true }
  },
  { timestamps: true } 
);


module.exports = mongoose.model('QuestionnaireResponse', QuestionnaireResponseSchema);

