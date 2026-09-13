import { useState } from 'react';

export default function ConnectScreen({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('');
  const join = () => onJoin(name);

  return (
    <div className="card">
      <h1 className="title">Party Games</h1>
      <p className="sub">Your phone is the controller.</p>

      <label className="lbl">Your name</label>
      <input
        className="field"
        placeholder="Name"
        maxLength={20}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && join()}
        autoFocus
      />

      <button className="btn primary" onClick={join}>Join game</button>
    </div>
  );
}
