import { useState } from 'react';
import { Button, Field, Screen, Sub, Title } from '../components/ui.js';

export default function ConnectScreen({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('');
  const join = () => onJoin(name);

  return (
    <Screen className="h-full flex flex-col justify-center">
      <Title>Game on the Go</Title>
      <Sub>Isn't it magical!</Sub>

      {/* TODO: Some sort of image here */}
      
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
