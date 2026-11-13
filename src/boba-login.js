// Browser entry: the form is assembled by the shipped bundle, not in View Source.
import '../public/boba/original.css';
import '../public/boba/auth.css';
import {mountAuthShell} from '../public/boba/auth-shell.js';
import {mountAuth} from '../public/boba/auth.js';
mountAuthShell();
mountAuth();
