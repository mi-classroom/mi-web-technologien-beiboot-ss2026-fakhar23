export default function ClickCounter({ count }: { count: number }) {
  return (
    <strong className="click-counter" aria-live="polite">
      <span className="click-counter-label">Clicks:</span>
      <span className="click-counter-value" aria-label={`${count}`}>
        <b className="click-counter-current" key={count}>{count}</b>
      </span>
    </strong>
  );
}
