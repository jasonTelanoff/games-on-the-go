import { useState } from 'react';
import { Button, Field, Screen, Sub, Title } from '../components/ui.js';

export default function ConnectScreen({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('');
  const join = () => onJoin(name);

  return (
    <Screen className="min-h-[85dvh] flex flex-col justify-center">
      <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted mb-3">
        Games on the go
      </div>
      <Title>Party Games</Title>
      <Sub>Your phone is the controller.</Sub>

      <Field
        placeholder="Your name"
        aria-label="Your name"
        maxLength={20}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && join()}
        autoFocus
      />

      <div className="mt-auto pt-10">
        <Button variant="primary" onClick={join}>Join game</Button>
      </div>
    </Screen>
  );
}
