const IG = "M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2Zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8Zm0 8.1a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.1-9.4a1.2 1.2 0 1 0 0 2.3 1.2 1.2 0 0 0 0-2.3Z";
const FB = "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z";

export function SocialLinks({ instagram, facebook }: { instagram?: string | null; facebook?: string | null }) {
  if (!instagram && !facebook) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {instagram && (
        <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer nofollow" className="btn-outline">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-pink-600" fill="currentColor" aria-hidden="true">
            <path d={IG} />
          </svg>
          @{instagram}
        </a>
      )}
      {facebook && (
        <a href={`https://facebook.com/${facebook}`} target="_blank" rel="noopener noreferrer nofollow" className="btn-outline">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-600" fill="currentColor" aria-hidden="true">
            <path d={FB} />
          </svg>
          {facebook}
        </a>
      )}
    </div>
  );
}
