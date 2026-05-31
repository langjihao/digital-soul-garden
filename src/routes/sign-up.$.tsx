import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/sign-up/$")({
  component: SignUpPage,
  head: () => ({ meta: [{ title: "注册 · ~/garden" }] }),
});

function SignUpPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 text-center font-mono text-xs uppercase tracking-[0.3em] text-primary">
        $ ./auth --sign-up
      </div>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/"
      />
    </div>
  );
}