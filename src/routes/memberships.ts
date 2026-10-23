import { Router } from 'express';
import { z } from 'zod';
import Membership from '../models/Membership.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
const router=Router(); router.use(requireAuth);
router.get('/', allowRoles('admin','staff','trainer','member'), async (req, res, next) => {
  try {
    const filter: any = {};
    if (req.user!.role === 'member') {
      filter.member = req.user!.id;
    } else {
      if (req.query.status) filter.status = req.query.status;
      if (req.query.member) filter.member = req.query.member;
    }
    const items = await Membership.find(filter)
      .populate('member', 'name email phone')
      .populate('plan', 'name pricePaise durationDays features description')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({ items });
  } catch(e) { next(e); }
});
router.post('/',allowRoles('admin','staff'),validate(z.object({body:z.object({member:z.string().length(24),plan:z.string().length(24),startDate:z.coerce.date().optional()})})),async(req,res,next)=>{try{const [member,plan]=await Promise.all([User.findById(req.body.member),Plan.findOne({_id:req.body.plan,active:true})]);if(!member||member.role!=='member')return res.status(400).json({message:'Valid member is required'});if(!plan)return res.status(400).json({message:'Active plan is required'});const start=req.body.startDate||new Date();const end=new Date(start);end.setDate(end.getDate()+plan.durationDays);const item=await Membership.create({member:member.id,plan:plan.id,startDate:start,endDate:end,status:'active',createdBy:req.user!.id});res.status(201).json({item});}catch(e){next(e);}});
export default router;
