import { useState } from 'react';
import { Button, Card, Field, Label, Sub, Title } from '../components/ui.js';

export default function ConnectScreen({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('');
  const join = () => onJoin(name);

  return (
    <Card>
      <Title>Party Games</Title>
      <Sub>Your phone is the controller.</Sub>

      <Label>Your name</Label>
      <Field
        placeholder="Name"
        maxLength={20}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && join()}
        autoFocus
      />

      <Button variant="primary" onClick={join}>Join game</Button>
    </Card>
  );
}
