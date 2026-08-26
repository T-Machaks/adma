import { QueryClient, MutationCache } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

// Global save/error confirmation for every mutation app-wide, so a save always gets
// visible feedback without each call site wiring up its own onSuccess/onError toast.
// MutationCache-level onSuccess/onError (as opposed to defaultOptions.mutations.*,
// which a mutation's own onSuccess/onError would silently override) run in addition
// to whatever a specific useMutation() call already does — this is the documented
// TanStack Query pattern for a global toast layer.
//
// Opt out per-mutation with `meta: { silent: true }` — used for high-frequency or
// already-has-its-own-feedback mutations (booth chat sends, live poll votes/mod
// updates, check-in scans, and anything that already calls toast() itself, e.g.
// ExhibitorTeam.jsx's resend-invite). Override the message with
// `meta: { successMessage, errorMessage }` where "Saved" / the raw error text isn't
// the right wording.
const mutationCache = new MutationCache({
  onSuccess: (_data, _variables, _context, mutation) => {
    const meta = mutation.options.meta || {};
    if (meta.silent) return;
    toast({ title: meta.successMessage || 'Saved', description: meta.successDescription });
  },
  onError: (error, _variables, _context, mutation) => {
    const meta = mutation.options.meta || {};
    if (meta.silent) return;
    toast({
      title: meta.errorMessage || 'Something went wrong',
      description: error?.message,
      variant: 'destructive',
    });
  },
});

export const queryClientInstance = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
