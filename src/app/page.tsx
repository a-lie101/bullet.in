"use client"; // makes this a client component

import { useRouter } from 'next/navigation';
import './login.css';





export default function LoginPage() {

    const router = useRouter(); // initializes router 

    const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // this prevents form from reloading the page
        router.push('/dashboard');
    };
    return (
        <>
        
        <h1> Bullet.in </h1><div className="glass-container">
            <div className="login-box">
                <h2>Login</h2>
                <form action="#" method="POST">

                    <input type="text" id="username" name="username" required placeholder="Username" />

                        <input type="password" id="password" name="password" required placeholder="Password" />

                            <div className="options">
                                <input type="checkbox" id="remember" name="remember" />
                                    <label htmlFor="remember">Remember me</label>
                                    <a href="#">Forgot Password?</a>
                                </div>

                            <button type="submit">Login</button>

                            <p>Don't have an account? <a href="#" id="register">Register</a></p>
                        </form>
                    </div>
                </div>
                
                </>
            );
        }