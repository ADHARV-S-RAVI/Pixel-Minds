import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2.5">
            <img src="/logo.png" alt="Pixel Minds" className="h-6 w-auto object-contain" />
            <span className="text-slate-900 font-semibold text-sm">Pixel Minds</span>
            <span className="text-slate-400 text-sm">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex space-x-6">
            <Link to="/opportunities" className="text-sm text-slate-500 hover:text-sky-600 transition-colors">Opportunities</Link>
            <a href="#" className="text-sm text-slate-500 hover:text-sky-600 transition-colors">Privacy</a>
            <a href="#" className="text-sm text-slate-500 hover:text-sky-600 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}