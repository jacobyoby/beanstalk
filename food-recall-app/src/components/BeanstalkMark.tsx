interface Props {
  className?: string;
}

/** Leaves that grow from the lowercase b. Ported from PR #63 header wordmark. */
export function WordmarkLeaves({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 44c0-12 7-21 15-28" />
      <path
        d="M17 30C7 31 2 24 3 17c9-1 17 5 14 13ZM22 23C20 13 29 5 39 6c0 10-8 19-17 17Z"
        fill="currentColor"
        fillOpacity=".13"
      />
    </svg>
  );
}

export default function BeanstalkMark({ className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M25 24C24 15 31 9 40 10C40 19 34 26 25 24Z"
        fill="var(--beanstalk-leaf, currentColor)"
        fillOpacity=".16"
      />
      <path
        d="M24 29C15 31 8 25 9 17C18 16 26 21 24 29Z"
        fill="var(--beanstalk-leaf, currentColor)"
        fillOpacity=".08"
      />
      <path d="M23 39C22 30 24 24 30 18M24 29C21 25 18 23 14 22" />
    </svg>
  );
}
