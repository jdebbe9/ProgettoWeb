// backend/controllers/safetyPlanController.js
const SafetyPlan = require('../models/SafetyPlan');

function uid(req){ return req?.user?._id || req?.user?.id; }

// GET /api/safety-plan  (solo paziente → il proprio)
exports.getMine = async (req,res,next)=>{
  try{
    const me = uid(req);
    const doc = await SafetyPlan.findOne({ patient: me }).lean();
    res.json(doc || { warningSigns:[], copingStrategies:[], trustedContacts:[], emergencyNotes:'' });
  }catch(e){ next(e); }
};

// PUT /api/safety-plan  (upsert del proprio)
exports.upsertMine = async (req,res,next)=>{
  try{
    const me = uid(req);
    const payload = {
      warningSigns:    Array.isArray(req.body?.warningSigns) ? req.body.warningSigns : [],
      copingStrategies:Array.isArray(req.body?.copingStrategies) ? req.body.copingStrategies : [],
      trustedContacts: Array.isArray(req.body?.trustedContacts) ? req.body.trustedContacts : [],
      emergencyNotes:  req.body?.emergencyNotes || ''
    };
    const doc = await SafetyPlan.findOneAndUpdate(
      { patient: me },
      { $set: payload, $setOnInsert: { patient: me } },
      { upsert: true, new: true }
    );
    res.json(doc);
  }catch(e){ next(e); }
};
