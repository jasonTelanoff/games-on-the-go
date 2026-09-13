import { useState } from 'react';
import { AVATARS } from '../../../src/avatars.js';
import { Avatar, Button, Field, Label, Screen, Sub, Title } from '../components/ui.js';

export default function ConnectScreen({ onJoin }: { onJoin: (name: string, avatarId: string) => void }) {
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);
  const join = () => onJoin(name, avatarId);

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

      <Label>Avatar</Label>
      <div className="grid grid-cols-4 gap-2 my-1" role="radiogroup" aria-label="Avatar">
        {AVATARS.map((a) => {
          const selected = a.id === avatarId;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={a.label}
              onClick={() => setAvatarId(a.id)}
              className={
                'h-16 rounded-xl flex items-center justify-center cursor-pointer transition-colors ' +
                (selected ? 'bg-accent' : 'bg-white/[0.07] active:bg-white/[0.12]')
              }
            >
              <Avatar id={a.id} />
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-10">
        <Button variant="primary" onClick={join}>Join game</Button>
      </div>
    </Screen>
  );
}
