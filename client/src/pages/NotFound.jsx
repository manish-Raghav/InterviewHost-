import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted">That address doesn't lead anywhere.</p>
        <Link to="/" className="btn btn-primary mt-6">
          Go to interviews
        </Link>
      </div>
    </div>
  );
}
