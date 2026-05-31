import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/sign-in/$")({
  component: SignInPage,
  head: () => ({ meta: [{ title: "登录 · ~/garden" }] }),
});

function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 text-center font-mono text-xs uppercase tracking-[0.3em] text-primary">
        $ ./auth --sign-in
      </div>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
      />
    </div>
  );
}