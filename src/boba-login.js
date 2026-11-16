// Celestial V3 login keeps the existing authenticated API flow and form validation.
import '../public/boba/original.css';
import '../public/boba/auth.css';
import '../public/boba/v3/auth.css';
import {mountV3AuthShell} from '../public/boba/v3/auth-shell.js';
import {mountAuth} from '../public/boba/auth.js';
mountV3AuthShell();
mountAuth();
