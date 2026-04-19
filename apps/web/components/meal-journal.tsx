"use client";

import type { FoodItem, MealEntry, MealMood, MealType } from "@today-table/core";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { RefreshCw, UtensilsCrossed } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getFirebaseAuth, getGoogleAuthProvider } from "@/lib/firebase-client";

type Session =
  | {
      provider: "firebase";
      user: User;
      username: string;
    }
  | {
      provider: "mock";
      username: string;
    };

const authMode = process.env.NEXT_PUBLIC_AUTH_MODE ?? (process.env.NODE_ENV === "production" ? "firebase" : "mock");

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "스낵"
};

const moodLabels: Record<MealMood, string> = {
  light: "가벼움",
  balanced: "균형",
  heavy: "과식",
  celebration: "특별식",
  unsure: "모름"
};

export function MealJournal() {
  const [session, setSession] = useState<Session | null>(null);
  const [mockUsername, setMockUsername] = useState("");
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [eatenAt, setEatenAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [foodLines, setFoodLines] = useState("");
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<MealMood>("balanced");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username = useMemo(() => session?.username ?? "", [session]);

  useEffect(() => {
    if (authMode === "mock") {
      const savedUsername = window.localStorage.getItem("today-table.username");

      if (savedUsername) {
        const nextSession: Session = { provider: "mock", username: savedUsername };
        setMockUsername(savedUsername);
        setSession(nextSession);
        void loadMeals(nextSession);
      }

      return;
    }

    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      if (nextUser) {
        const nextSession: Session = {
          provider: "firebase",
          user: nextUser,
          username: nextUser.displayName?.split(" ")[0] ?? nextUser.email ?? "사용자"
        };
        setSession(nextSession);
        void loadMeals(nextSession);
      } else {
        setSession(null);
        setMeals([]);
      }
    });
  }, []);

  async function loadMeals(activeSession = session) {
    if (!activeSession) {
      return;
    }

    setError(null);
    const response = await fetch("/api/meals?limit=30", {
      headers: await createAuthHeaders(activeSession)
    });

    if (!response.ok) {
      setError("식사 기록을 불러오지 못했습니다.");
      return;
    }

    const data = (await response.json()) as { meals: MealEntry[] };
    setMeals(data.meals);
  }

  async function handleMockLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const username = mockUsername.trim();

    if (!username) {
      setError("로컬 개발용 username을 입력해주세요.");
      return;
    }

    const nextSession: Session = { provider: "mock", username };
    window.localStorage.setItem("today-table.username", username);
    setSession(nextSession);
    await loadMeals(nextSession);
  }

  async function handleLogout() {
    if (session?.provider === "firebase") {
      await signOut(getFirebaseAuth());
      return;
    }

    window.localStorage.removeItem("today-table.username");
    setSession(null);
    setMeals([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      if (authMode === "firebase") {
        await signInWithPopup(getFirebaseAuth(), getGoogleAuthProvider());
      }
      return;
    }

    const items = parseFoodLines(foodLines);

    if (items.length === 0) {
      setError("음식 이름을 한 개 이상 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(await createAuthHeaders(session))
        },
        body: JSON.stringify({
          eatenAt: new Date(eatenAt).toISOString(),
          mealType,
          items,
          note,
          mood,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        })
      });

      if (!response.ok) {
        throw new Error("Failed to record meal");
      }

      setFoodLines("");
      setTags("");
      setNote("");
      setMood("balanced");
      await loadMeals(session);
    } catch {
      setError("기록 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-[min(1120px,calc(100vw-32px))] py-8">
      <header className="grid gap-6 pb-8 md:flex md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-coral">TodayTable PoC</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-none tracking-normal text-foreground md:text-6xl">
            오늘의 식사를 기록하고 흐름을 봅니다.
          </h1>
        </div>
        <div className="flex min-h-11 items-center gap-3 whitespace-nowrap text-sm text-muted-foreground">
          {session ? (
            <>
              <span>{username}</span>
              <Button type="button" variant="outline" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          ) : authMode === "mock" ? (
            <form className="flex items-center gap-2" onSubmit={handleMockLogin}>
              <Input
                className="w-40"
                value={mockUsername}
                onChange={(event) => setMockUsername(event.target.value)}
                placeholder="username"
              />
              <Button type="submit">Mock 로그인</Button>
            </form>
          ) : (
            <Button type="button" onClick={() => signInWithPopup(getFirebaseAuth(), getGoogleAuthProvider())}>
              Google로 시작
            </Button>
          )}
        </div>
      </header>

      <section className="grid items-start gap-6 lg:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              빠른 기록
            </CardTitle>
            <CardDescription>한 줄에 음식 하나씩 입력합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <Label>
                먹은 시간
                <Input type="datetime-local" value={eatenAt} onChange={(event) => setEatenAt(event.target.value)} />
              </Label>

              <div className="grid grid-cols-2 gap-3">
                <Label>
                  식사 종류
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={mealType}
                    onChange={(event) => setMealType(event.target.value as MealType)}
                  >
                    {Object.entries(mealTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Label>
                <Label>
                  상태
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={mood}
                    onChange={(event) => setMood(event.target.value as MealMood)}
                  >
                    {Object.entries(moodLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Label>
              </div>

              <Label>
                음식
                <Textarea
                  value={foodLines}
                  onChange={(event) => setFoodLines(event.target.value)}
                  placeholder={"현미밥 - 반 공기\n닭가슴살 샐러드\n아메리카노"}
                  rows={6}
                />
              </Label>

              <Label>
                태그
                <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="집밥, 운동 후" />
              </Label>

              <Label>
                메모
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="속이 편했는지, 양은 어땠는지" rows={3} />
              </Label>

              {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}

              <Button type="submit" disabled={isSubmitting || !session}>
                {isSubmitting ? "저장 중" : "기록 저장"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="min-h-[520px]">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>최근 기록</CardTitle>
              <CardDescription>로컬 PoC에서는 SQLite에 저장됩니다.</CardDescription>
            </div>
            <Button type="button" variant="secondary" size="icon" onClick={() => loadMeals()} aria-label="새로고침">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {session ? (
              meals.length > 0 ? (
                <ol className="grid gap-3">
                  {meals.map((meal) => (
                    <li className="grid gap-2 rounded-lg border bg-background p-4" key={meal.id}>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <time dateTime={meal.eatenAt}>{formatDate(meal.eatenAt)}</time>
                        <span className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">{mealTypeLabels[meal.mealType]}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{moodLabels[meal.mood]}</span>
                      </div>
                      <strong className="text-lg">{meal.items.map((item) => item.name).join(", ")}</strong>
                      {meal.note ? <p className="text-sm leading-6 text-muted-foreground">{meal.note}</p> : null}
                      {meal.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {meal.tags.map((tag) => (
                            <em className="text-xs font-bold not-italic text-coral" key={tag}>
                              {tag}
                            </em>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="leading-7 text-muted-foreground">아직 기록이 없습니다.</p>
              )
            ) : (
              <p className="leading-7 text-muted-foreground">
                {authMode === "mock" ? "username으로 mock 로그인하면 로컬 SQLite에 저장할 수 있습니다." : "Google 계정으로 로그인하면 식사 기록을 저장할 수 있습니다."}
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

async function createAuthHeaders(session: Session): Promise<HeadersInit> {
  if (session.provider === "mock") {
    return {
      "x-mock-username": session.username
    };
  }

  return {
    authorization: `Bearer ${await session.user.getIdToken()}`
  };
}

function parseFoodLines(value: string): FoodItem[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, amount] = line.split(" - ");
      return {
        name: name.trim(),
        amount: amount?.trim()
      };
    });
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
