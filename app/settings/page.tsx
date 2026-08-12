"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Database,
  Trash2,
  LogOut,
  Shield,
  Github,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getUserRules, deleteUserRule } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import { UserRule } from "@/lib/types";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [clearing, setClearing] = useState(false);
  const [rules, setRules] = useState<UserRule[]>([]);

  const loadRules = async () => {
    try {
      setRules(await getUserRules());
    } catch (error) {
      console.error("Error loading rules:", error);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleDeleteRule = async (pattern: string) => {
    await deleteUserRule(pattern);
    loadRules();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/login");
  }

  const handleClearData = async () => {
    if (!confirm("¿Estás seguro? Esto eliminará todas tus transacciones guardadas.")) {
      return;
    }

    setClearing(true);
    try {
      // Clear only this app's IndexedDB database
      indexedDB.deleteDatabase("expense-tracker");
      alert("Datos eliminados correctamente. La página se recargará.");
      window.location.reload();
    } catch (error) {
      console.error("Error clearing data:", error);
      alert("Error al eliminar los datos");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Ajustes
          </h1>
          <p className="text-dark-400 mt-1">
            Configura tu cuenta y preferencias
          </p>
        </div>

        <div className="space-y-6 max-w-2xl">
          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={session?.user?.image || "/default-avatar.svg"}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <p className="text-white font-medium text-lg">
                    {session?.user?.name}
                  </p>
                  <p className="text-dark-400 flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {session?.user?.email}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-dark-700">
                <Button
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-dark-800 border border-dark-700">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Almacenamiento local</p>
                    <p className="text-dark-400 text-sm mt-1">
                      Tus transacciones se guardan únicamente en este navegador
                      usando IndexedDB. Para categorizar automáticamente, solo el
                      nombre del comercio y el monto se envían al servicio de IA
                      (Groq); no almacenamos tus datos financieros en ningún
                      servidor.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-dark-700">
                <Button
                  variant="danger"
                  onClick={handleClearData}
                  disabled={clearing}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {clearing ? "Eliminando..." : "Eliminar todos los datos"}
                </Button>
                <p className="text-dark-500 text-xs mt-2">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Custom rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Reglas personalizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <p className="text-dark-400 text-sm">
                  Aún no tienes reglas. Cuando corrijas la categoría de una
                  transacción, te ofreceremos crear una para clasificar
                  automáticamente comercios similares la próxima vez.
                </p>
              ) : (
                <div className="space-y-2">
                  {rules.map((rule) => {
                    const category = CATEGORIES[rule.categoryId];
                    return (
                      <div
                        key={rule.pattern}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-dark-800 border border-dark-700"
                      >
                        <div className="min-w-0 flex items-center gap-2 text-sm">
                          <span className="text-dark-400">Contiene</span>
                          <span className="text-white font-mono truncate">
                            «{rule.pattern}»
                          </span>
                          <span className="text-dark-400">→</span>
                          <span className="text-white whitespace-nowrap">
                            {category.icon} {category.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteRule(rule.pattern)}
                          className="text-dark-400 hover:text-red-400 transition-colors shrink-0"
                          aria-label="Eliminar regla"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>Acerca de</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-white">ExpenseAI v0.1.0</p>
                <p className="text-dark-400 text-sm">
                  Rastrea tus gastos automáticamente desde las alertas de tu banco
                  usando inteligencia artificial.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-dark-700">
                <a
                  href="https://github.com/menesesariel/finabanca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
                >
                  <Github className="w-4 h-4" />
                  <span className="text-sm">GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

