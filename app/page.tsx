"use client";

import { useEffect, useState } from "react";

interface User {
  name: string;
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://3.110.85.63:5000/users")
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch users:", err);
        setLoading(false);
      });
  }, []);

  return (
    <main className="flex-1 p-8 md:p-12 max-w-7xl mx-auto w-full">
      <header className="mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-4">
          Community Dashboard
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl">
          Real-time overview of active platform members and their current status within the ecosystem.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-2xl p-6 h-32 animate-pulse" />
          ))
        ) : users.length > 0 ? (
          users.map((user, index) => (
            <div
              key={index}
              className="glass rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:bg-indigo-500/40 transition-colors">
                  <span className="text-indigo-400 font-bold text-xl">
                    {user.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {user.name}
                  </h3>
                  <p className="text-slate-500 text-sm">Active Member</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full glass rounded-2xl p-12 text-center animate-fade-in">
            <p className="text-slate-500 text-lg">No users found in the system.</p>
          </div>
        )}
      </section>
    </main>
  );
}