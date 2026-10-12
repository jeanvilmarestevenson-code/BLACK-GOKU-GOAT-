const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const express = require('express')
const axios = require('axios')
const app = express()
const PORT = process.env.PORT || 3000

let lastCode = "Génération..."
let status = "Démarrage..."
const OWNER_NUMBER = "555182215198"
const PREFIX = "₩"
const DB_FILE = './black_db.json'

let db = { owner:null, amis:[], blocked:[], saved:[], chut:[], pro:[], godmode:[], antisticker:[], welcome:[], ghost:[], pt:[], botOn:true, style:"black" }
if(fs.existsSync(DB_FILE)){ try{ db=JSON.parse(fs.readFileSync(DB_FILE)) }catch{} }
const saveDB = ()=>fs.writeFileSync(DB_FILE, JSON.stringify(db))

const R = {
  ban:"🖤 *L'ordre de Black Goku est absolu.* Cet être a été banni de ce monde.",
  kick:"💀 *Disparais.* Black Goku n'a pas besoin de toi ici.",
  add:"⚡ *Une nouvelle âme rejoint le champ de bataille.*",
  promote:"👑 *Je t'élève. Ne me déçois pas.*",
  demote:"📉 *Tu as perdu ma faveur. Retombe dans l'ombre.*",
  mute:"🤫 *Silence imposé. Ce groupe se tait devant moi.*",
  unmute:"🔊 *Je vous rends la parole. Parlez.*",
  chut:"🔇 *Son existence sera effacée à chaque mot. Il est condamné au silence.*",
  unchut:"🔓 *Sa punition prend fin.*",
  save:"🛡️ *Tu es sous la protection de Black Goku. Personne ne te touchera.*",
  unsave:"💔 *Ma protection t'est retirée.*",
  blockadmin:"🚫 *Tes pouvoirs d'admin t'ont été arrachés. Tu n'es plus rien ici.*",
  unblockadmin:"✅ *Je te rends ton pouvoir.*",
  pro:"👁️ *Il est marqué par ma protection divine. Le toucher, c'est me défier.*",
  amis:"🖤 *Je te reconnais. Tu peux utiliser une part de mon pouvoir.*",
  noami:"❌ *Je te retire mon pouvoir. Tu n'es plus rien.*",
  god_on:"🔒 *GODMODE activé. Ce groupe est sous mon contrôle absolu.*",
  god_off:"🔓 *GODMODE désactivé.*",
  antistick_on:"🚫 *Les stickers sont bannis de ce royaume. Ils seront détruits.*",
  antistick_off:"✅ *Les stickers sont de nouveau tolérés.*",
  wel_on:"🌸 *J'accueillerai chaque nouvelle âme qui entre ici.*",
  wel_off:"🥀 *Je ne les accueillerai plus.*",
  ghost_on:"👻 *Je deviens fantôme. Invisible. Intouchable.*",
  ghost_off:"👁️ *Je redeviens visible.*",
  pt_on:"🌀 *Mode PT activé. Je protège ce groupe de toute modification.*",
  pt_off:"🌀 *Mode PT désactivé.*",
  bot_on:"🔥 *Black Goku est de retour. Tremblez.* 🔥",
  bot_off:"💤 *Black Goku s'endort... mais il vous observe toujours.*",
  vq:"👁️ *Le voile est tombé. Black Goku a révélé ce qui était caché.*",
  vq2:"🖤 *Rien ne m'échappe. Même l'éphémère m'appartient.* 🖤"
}

const getMenu = ()=>`BLACK GOKU
╭────────────────
│ GESTION GROUPE
│ • ban / kick
│ • add
│ • promote / demote
│ • admin
│ • groupinfo
│
│ MODERATION
│ • mute / unmute
│ • chut / unchut
│ • tagall
│ • hidetag
│ • godmode on/off
│ • antisticker on/off
│ • welcome on/off
│
│ PROTECTION
│ • save / unsave
│ • blockadmin / unblockadmin
│
│ SECRET & FUN
│ • vq
│ • ghost on/off
│ • rdm
│ • sticker
│
│ STYLE & CONFIG
│ • mode / style
│ • config / black / info
│ • pt on/off
│
│ OWNER ONLY
│ • bot on/off
│ • amis / noami
│ • pro
╰────────────────
BLACK GOKU`

async function startBot(){
const { state, saveCreds } = await useMultiFileAuthState('auth')
const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser: ["Ubuntu","Chrome","20.0"], markOnlineOnConnect:!db.ghost.includes('global') })
sock.ev.on('creds.update', saveCreds)
if(!state.creds.registered){
  setTimeout(async()=>{
    try{ let code=await sock.requestPairingCode(OWNER_NUMBER); lastCode=code; status="CODE PRÊT ✅" }catch(e){ lastCode=e.message }
  },3000)
}
sock.ev.on('connection.update', u=>{
  if(u.connection==='open'){ status="BLACK GOKU H24 ACTIF ✅"; db.owner=sock.user.id; saveDB() }
  if(u.connection==='close'){ if(u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(startBot,3000) }
})
sock.ev.on('group-participants.update', async(an)=>{
  if(!db.welcome.includes(an.id)) return
  try{
    if(an.action==='add'){
      for(let p of an.participants){
        await sock.sendMessage(an.id,{text:`🌑 *Bienvenue ${p.split('@')[0]}.*\nTu entres dans le domaine de Black Goku. Obéis ou disparais.`, mentions:[p]})
      }
    }
  }catch{}
})

sock.ev.on('messages.upsert', async({messages})=>{
  const m=messages[0]; if(!m.message) return
  const from=m.key.remoteJid
  const sender=m.key.participant||from
  const isGroup=from.endsWith('@g.us')
  const senderNum=sender.replace(/[^0-9]/g,'')
  const ownerNum="555182215198"
  let content=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||m.message.stickerMessage?.caption||""
  let isSticker =!!m.message.stickerMessage
  if(isGroup && isSticker && db.antisticker.includes(from)){ try{ await sock.sendMessage(from,{delete:m.key}); return }catch{} }
  if(db.chut.includes(sender) && isGroup){ try{ await sock.sendMessage(from,{delete:m.key}); return }catch{} }
  if(!content.startsWith(PREFIX)) return
  const args=content.slice(1).trim().split(/ +/)
  const cmd=args[0].toLowerCase()
  const q=args.slice(1).join(' ')
  const mentioned=m.message.extendedTextMessage?.contextInfo?.mentionedJid||[]
  const getTarget=()=>mentioned[0]||(q.replace(/[^0-9]/g,'')?q.replace(/[^0-9]/g,'')+'@s.whatsapp.net':null)
  const getTargetNum=()=>q.replace(/[^0-9]/g,'')||(mentioned[0]||'').replace(/[^0-9]/g,'')
  const isOwner=sender===db.owner||m.key.fromMe||senderNum.includes(ownerNum)
  const isAmi=db.amis.includes(sender)||db.amis.includes(senderNum)||db.amis.some(x=>x.includes(senderNum))
  const canUse=isOwner||isAmi
  let target=getTarget()
  if(target){
    let tNum=target.replace(/[^0-9]/g,'')
    if(tNum.includes(ownerNum)||target===db.owner){
      await sock.sendMessage(from,{text:"⚡ *Tu ne peut pas vaincre Black Goku* ⚡"},{quoted:m})
      if(isGroup && ["ban","kick","demote","chut","blockadmin"].includes(cmd)){
        try{ await sock.groupParticipantsUpdate(from,[sender],"remove") }catch{}
      }
      return
    }
    if((db.pro.includes(target)||db.saved.includes(target))&&!isOwner){
      await sock.sendMessage(from,{text:`🛡️ *Cette âme est protégée par Black Goku. Tu subiras son sort.*`},{quoted:m})
      try{ if(isGroup) await sock.groupParticipantsUpdate(from,[sender],"remove") }catch{}
      return
    }
  }
  if(!canUse){ await sock.sendMessage(from,{text:"🖤 *Seul Black Goku peut utiliser ce pouvoir* 🖤"},{quoted:m}); return }
  if(!db.botOn&&!isOwner&&cmd!=="bot") return
  try{
  if(["black","menu","config","info","help"].includes(cmd)){ await sock.sendMessage(from,{text:getMenu()},{quoted:m}) }
  else if(cmd==="mode"||cmd==="style"){ db.style=db.style==="black"?"rose":"black"; saveDB(); await sock.sendMessage(from,{text:`🎨 *Style changé en ${db.style}. Je suis toujours aussi sombre.*`},{quoted:m}) }
  else if(cmd==="amis"){ if(isGroup){ if(!target) return sock.sendMessage(from,{text:"Mentionne: ₩amis @user"},{quoted:m}); if(!db.amis.includes(target)){db.amis.push(target);saveDB()} } else { let num=getTargetNum()+'@s.whatsapp.net'; if(!db.amis.includes(num)){db.amis.push(num);saveDB()} } await sock.sendMessage(from,{text:R.amis},{quoted:m}) }
  else if(cmd==="noami"){ if(isGroup){ if(!target) return; db.amis=db.amis.filter(x=>x!==target); saveDB() } else { let num=getTargetNum(); db.amis=db.amis.filter(x=>!x.includes(num)); saveDB() } await sock.sendMessage(from,{text:R.noami},{quoted:m}) }
  else if(cmd==="ban"||cmd==="kick"){ if(!isGroup) return; if(!target) return; await sock.groupParticipantsUpdate(from,[target],"remove"); await sock.sendMessage(from,{text:R.ban},{quoted:m}) }
  else if(cmd==="add"){ let n=q.replace(/[^0-9]/g,''); if(!n) return; await sock.groupParticipantsUpdate(from,[n+'@s.whatsapp.net'],"add"); await sock.sendMessage(from,{text:R.add},{quoted:m}) }
  else if(cmd==="promote"){ if(target){ await sock.groupParticipantsUpdate(from,[target],"promote"); await sock.sendMessage(from,{text:R.promote},{quoted:m}) } }
  else if(cmd==="demote"){ if(target){ await sock.groupParticipantsUpdate(from,[target],"demote"); await sock.sendMessage(from,{text:R.demote},{quoted:m}) } }
  else if(cmd==="mute"){ await sock.groupSettingUpdate(from,'announcement'); await sock.sendMessage(from,{text:R.mute},{quoted:m}) }
  else if(cmd==="unmute"){ await sock.groupSettingUpdate(from,'not_announcement'); await sock.sendMessage(from,{text:R.unmute},{quoted:m}) }
  else if(cmd==="chut"){ if(!target) return; if(!db.chut.includes(target)){db.chut.push(target);saveDB()} await sock.sendMessage(from,{text:R.chut},{quoted:m}) }
  else if(cmd==="unchut"){ if(!target) return; db.chut=db.chut.filter(x=>x!==target);saveDB(); await sock.sendMessage(from,{text:R.unchut},{quoted:m}) }
  else if(cmd==="save"){ if(isGroup){ if(!target) return; if(!db.saved.includes(target)){db.saved.push(target);saveDB()} await sock.sendMessage(from,{text:R.save},{quoted:m}) } else { let num=getTargetNum()+'@s.whatsapp.net'; if(!db.saved.includes(num)){db.saved.push(num);saveDB()} await sock.sendMessage(from,{text:`🛡️ *${getTargetNum()} est protégé dans tous les groupes.*`},{quoted:m}) } }
  else if(cmd==="unsave"){ if(isGroup){ if(!target) return; db.saved=db.saved.filter(x=>x!==target);saveDB(); await sock.sendMessage(from,{text:R.unsave},{quoted:m}) } else { let num=getTargetNum(); db.saved=db.saved.filter(x=>!x.includes(num));saveDB(); await sock.sendMessage(from,{text:R.unsave},{quoted:m}) } }
  else if(cmd==="blockadmin"){ if(!target) return; if(!db.blocked.includes(target)){db.blocked.push(target);saveDB()} await sock.sendMessage(from,{text:R.blockadmin},{quoted:m}) }
  else if(cmd==="unblockadmin"){ if(!target) return; db.blocked=db.blocked.filter(x=>x!==target);saveDB(); await sock.sendMessage(from,{text:R.unblockadmin},{quoted:m}) }
  else if(cmd==="pro"){ if(!target) return; if(!db.pro.includes(target)){db.pro.push(target);saveDB()} if(!db.saved.includes(target)){db.saved.push(target);saveDB()} await sock.sendMessage(from,{text:R.pro},{quoted:m}) }
  else if(cmd==="tagall"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:q||"🌑 Black Goku vous invoque", mentions:meta.participants.map(p=>p.id)},{quoted:m}) }
  else if(cmd==="hidetag"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:q||"🖤", mentions:meta.participants.map(p=>p.id)},{quoted:m}) }
  else if(cmd==="godmode"){ if(q.includes("off")){ db.godmode=db.godmode.filter(x=>x!==from); saveDB(); await sock.sendMessage(from,{text:R.god_off},{quoted:m}) } else { if(!db.godmode.includes(from)){db.godmode.push(from);saveDB()} await sock.sendMessage(from,{text:R.god_on},{quoted:m}) } }
  else if(cmd==="antisticker"){ if(q.includes("off")){ db.antisticker=db.antisticker.filter(x=>x!==from); saveDB(); await sock.sendMessage(from,{text:R.antistick_off},{quoted:m}) } else { if(!db.antisticker.includes(from)){db.antisticker.push(from);saveDB()} await sock.sendMessage(from,{text:R.antistick_on},{quoted:m}) } }
  else if(cmd==="welcome"){ if(q.includes("off")){ db.welcome=db.welcome.filter(x=>x!==from); saveDB(); await sock.sendMessage(from,{text:R.wel_off},{quoted:m}) } else { if(!db.welcome.includes(from)){db.welcome.push(from);saveDB()} await sock.sendMessage(from,{text:R.wel_on},{quoted:m}) } }
  else if(cmd==="ghost"){ if(q.includes("off")){ db.ghost=db.ghost.filter(x=>x!=='global'); saveDB(); await sock.sendMessage(from,{text:R.ghost_off},{quoted:m}) } else { if(!db.ghost.includes('global')){db.ghost.push('global');saveDB()} await sock.sendMessage(from,{text:R.ghost_on},{quoted:m}) } }
  else if(cmd==="pt"){ if(q.includes("off")){ db.pt=db.pt.filter(x=>x!==from); saveDB(); await sock.sendMessage(from,{text:R.pt_off},{quoted:m}) } else { if(!db.pt.includes(from)){db.pt.push(from);saveDB()} await sock.sendMessage(from,{text:R.pt_on},{quoted:m}) } }
  else if(cmd==="vq"){
    const quoted=m.message.extendedTextMessage?.contextInfo?.quotedMessage
    if(!quoted) return sock.sendMessage(from,{text:"🖤 *Réponds à une vue unique pour que je perce son voile.* 🖤"},{quoted:m})
    const msg=quoted.viewOnceMessageV2?.message||quoted.viewOnceMessage?.message
    if(!msg) return sock.sendMessage(from,{text:"💀 *Ce voile est vide. Il n'y a rien à révéler.* 💀"},{quoted:m})
    const type=Object.keys(msg)[0]
    const stream=await downloadContentFromMessage(msg[type], type.includes('image')?'image':'video')
    let buffer=Buffer.from([]); for await(const c of stream) buffer=Buffer.concat([buffer,c])
    if(type.includes('image')){
      await sock.sendMessage(from,{image:buffer, caption:R.vq},{quoted:m})
      await sock.sendMessage(from,{text:R.vq2},{quoted:m})
    } else {
      await sock.sendMessage(from,{video:buffer, caption:"👁️ *Révélé par Black Goku. L'invisible devient visible.* 👁️"},{quoted:m})
      await sock.sendMessage(from,{text:"⚡ *Tu pensais pouvoir cacher cela? Pitoyable.* ⚡"},{quoted:m})
    }
  }
  else if(cmd==="rdm"){
    try{
      let url = Math.random()>0.5? 'https://api.waifu.pics/sfw/waifu' : 'https://api.waifu.pics/sfw/shinobu'
      let res=await axios.get(url)
      await sock.sendMessage(from,{image:{url:res.data.url}, caption:"🌸 *Création de Black Goku* 🌸"},{quoted:m})
    }catch{
      let res=await axios.get('https://api.waifu.pics/sfw/boy')
      await sock.sendMessage(from,{image:{url:res.data.url}, caption:"⚡ *Garçon créé par Black Goku* ⚡"},{quoted:m})
    }
  }
  else if(cmd==="sticker"){
    const quoted=m.message.extendedTextMessage?.contextInfo?.quotedMessage
    let media=m.message.imageMessage||quoted?.imageMessage||m.message.videoMessage||quoted?.videoMessage
    if(media){
      const stream=await downloadContentFromMessage(media, 'image')
      let buffer=Buffer.from([]); for await(const c of stream) buffer=Buffer.concat([buffer,c])
      await sock.sendMessage(from,{sticker:buffer},{quoted:m})
    } else { await sock.sendMessage(from,{text:"Envoie une image avec ₩sticker ou réponds à une image!"},{quoted:m}) }
  }
  else if(cmd==="bot"){ if(!isOwner) return; if(q==="off"){ db.botOn=false; saveDB(); await sock.sendMessage(from,{text:R.bot_off},{quoted:m}) } else { db.botOn=true; saveDB(); await sock.sendMessage(from,{text:R.bot_on},{quoted:m}) } }
  else if(cmd==="groupinfo"||cmd==="admin"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:`*${meta.subject}*\nMembres: ${meta.participants.length}\nAdmins: ${meta.participants.filter(p=>p.admin).length}\nGODMODE: ${db.godmode.includes(from)?'ON':'OFF'}`},{quoted:m}) }
  }catch(e){ console.log(e) }
})
}
startBot()
app.get('/', (req,res)=>{
  res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#000;color:#fff;font-family:Arial;text-align:center;padding:20px}.box{border:2px solid #a00;padding:20px;border-radius:15px;margin-top:30px}.code{font-size:35px;letter-spacing:4px;color:#ff0040;font-weight:bold}</style></head><body><h1>BLACK-GOKU H24 🖤</h1><div class="box"><p>${status}</p><h2>CODE 8 CHIFFRES:</h2><div class="code">${lastCode}</div><p>WhatsApp > Appareils liés > Lier avec numéro</p></div><pre style="text-align:left;margin-top:20px;border:1px solid #333;padding:10px;white-space:pre-wrap">${getMenu()}</pre></body></html>`)
})
app.listen(PORT, ()=>console.log("WEB "+PORT))
