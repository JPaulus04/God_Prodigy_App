import React, { useState } from 'react';
export default function NameEntry({ onConfirm }) {
  const [name, setName] = useState('');
  return (
    <div style={{ position:'absolute', inset:0, background:'#0d0d1a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#fff', padding:32 }}>
      <h1 style={{ fontSize:36, color:'#d4af37', marginBottom:8 }}>GOD PRODIGY</h1>
      <p style={{ color:'#aaa', marginBottom:48, textAlign:'center', fontSize:14 }}>Forge your path. Defeat the 10 elemental gods. Ascend.</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" maxLength={20} style={{ padding:'14px 20px', fontSize:18, borderRadius:8, border:'2px solid #d4af37', background:'#111', color:'#fff', width:'100%', maxWidth:300, marginBottom:24, textAlign:'center' }} />
      <button onClick={() => onConfirm(name.trim() || 'Wanderer')} style={{ padding:'14px 48px', fontSize:18, borderRadius:8, background:'#d4af37', border:'none', color:'#0d0d1a', fontWeight:'bold', cursor:'pointer', width:'100%', maxWidth:300 }}>Begin Your Path</button>
    </div>
  );
}
