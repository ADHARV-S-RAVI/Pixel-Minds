import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';import App from './App';import './index.css';import {AppProvider} from './store';
createRoot(document.getElementById('root')!).render(<BrowserRouter><AppProvider><App/></AppProvider></BrowserRouter>);
