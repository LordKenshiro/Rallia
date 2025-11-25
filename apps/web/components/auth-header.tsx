import { ModeToggle } from '@/components/mode-toggle';

export async function AuthHeader() {
  return (
    <div className="absolute top-4 right-4">
      <ModeToggle />
    </div>
  );
}
