type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function BaseIcon({ size = 20, children, ...props }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}
		>
			{children}
		</svg>
	);
}

export function GoogleIcon({ size = 18, ...props }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" {...props}>
			<path
				fill="#EA4335"
				d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
			/>
			<path
				fill="#4285F4"
				d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
			/>
			<path
				fill="#FBBC05"
				d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
			/>
			<path
				fill="#34A853"
				d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
			/>
		</svg>
	);
}

export function GraphIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<circle cx="6" cy="6" r="2.5" />
			<circle cx="18" cy="6" r="2.5" />
			<circle cx="12" cy="18" r="2.5" />
			<path d="M8.3 7.2 10.8 16" />
			<path d="M15.7 7.2 13.2 16" />
			<path d="M8.3 7.2 15.7 7.2" />
		</BaseIcon>
	);
}

export function LogoutIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
			<polyline points="16 17 21 12 16 7" />
			<line x1="21" y1="12" x2="9" y2="12" />
		</BaseIcon>
	);
}

export function CheckCircleFilledIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" fill="currentColor" stroke="none" />
			<path d="m8.5 12.2 2.4 2.4 4.6-4.6" stroke="#fff" strokeWidth={2} />
		</BaseIcon>
	);
}

export function XIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</BaseIcon>
	);
}

export function CheckIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<polyline points="20 6 9 17 4 12" />
		</BaseIcon>
	);
}

export function AlertIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<circle cx="12" cy="12" r="10" />
			<line x1="12" y1="8" x2="12" y2="12" />
			<line x1="12" y1="16" x2="12.01" y2="16" />
		</BaseIcon>
	);
}

export function SpinnerIcon(props: IconProps) {
	return (
		<svg width={props.size ?? 20} height={props.size ?? 20} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
			<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
			<path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
		</svg>
	);
}

export function SaveIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
			<polyline points="17 21 17 13 7 13 7 21" />
			<polyline points="7 3 7 8 15 8" />
		</BaseIcon>
	);
}

export function TrashIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<polyline points="3 6 5 6 21 6" />
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			<line x1="10" y1="11" x2="10" y2="17" />
			<line x1="14" y1="11" x2="14" y2="17" />
		</BaseIcon>
	);
}

export function PlusIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<line x1="12" y1="5" x2="12" y2="19" />
			<line x1="5" y1="12" x2="19" y2="12" />
		</BaseIcon>
	);
}

export function InfoIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<circle cx="12" cy="12" r="10" />
			<line x1="12" y1="16" x2="12" y2="12" />
			<line x1="12" y1="8" x2="12.01" y2="8" />
		</BaseIcon>
	);
}

export function HelpCircleIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<circle cx="12" cy="12" r="10" />
			<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
			<line x1="12" y1="17" x2="12.01" y2="17" />
		</BaseIcon>
	);
}

export function UsersIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</BaseIcon>
	);
}

export function GraduationIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<path d="M22 10 12 5 2 10l10 5 10-5z" />
			<path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
			<line x1="22" y1="10" x2="22" y2="16" />
		</BaseIcon>
	);
}

export function DownloadIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</BaseIcon>
	);
}

export function FileTextIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
			<line x1="16" y1="13" x2="8" y2="13" />
			<line x1="16" y1="17" x2="8" y2="17" />
		</BaseIcon>
	);
}

export function HomeIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<path d="M3 9.5 12 3l9 6.5" />
			<path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
			<path d="M9 21v-6h6v6" />
		</BaseIcon>
	);
}

export function FolderIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
		</BaseIcon>
	);
}

export function PlayIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<polygon points="6 3 20 12 6 21 6 3" />
		</BaseIcon>
	);
}

export function SettingsIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<line x1="4" y1="21" x2="4" y2="14" />
			<line x1="4" y1="10" x2="4" y2="3" />
			<line x1="12" y1="21" x2="12" y2="12" />
			<line x1="12" y1="8" x2="12" y2="3" />
			<line x1="20" y1="21" x2="20" y2="16" />
			<line x1="20" y1="12" x2="20" y2="3" />
			<line x1="1" y1="14" x2="7" y2="14" />
			<line x1="9" y1="8" x2="15" y2="8" />
			<line x1="17" y1="16" x2="23" y2="16" />
		</BaseIcon>
	);
}

export function EyeIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
			<circle cx="12" cy="12" r="3" />
		</BaseIcon>
	);
}

export function ArrowRightIcon(props: IconProps) {
	return (
		<BaseIcon {...props}>
			<line x1="5" y1="12" x2="19" y2="12" />
			<polyline points="12 5 19 12 12 19" />
		</BaseIcon>
	);
}