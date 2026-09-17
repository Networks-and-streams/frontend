import { SpinnerIcon } from '@/shared/icons';

interface FullScreenLoaderProps {
	message?: string;
}

export default function FullScreenLoader({ message }: FullScreenLoaderProps) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
			<SpinnerIcon size={28} className="animate-spin text-accent" />
			{message && <p className="text-sm text-foreground/40">{message}</p>}
		</div>
	);
}