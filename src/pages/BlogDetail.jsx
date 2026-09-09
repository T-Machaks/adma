import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BlogPost } from '@/api/entities';
import { ArrowLeft, Calendar, User, Newspaper } from 'lucide-react';
import { useSEO } from '@/lib/useSEO';

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', id],
    queryFn: () => BlogPost.get(id),
  });

  const dateStr = post?.published_date || post?.created_date;

  useSEO({
    title: post?.title || 'Blog Post',
    description: post?.excerpt?.trim()?.slice(0, 200) || (post ? `${post.title} — on the ADMA Digital blog.` : undefined),
    path: `/blog/${id}`,
    image: post?.cover_image_url,
    jsonLd: post ? {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt || undefined,
      image: post.cover_image_url || undefined,
      author: post.author_name ? { '@type': 'Person', name: post.author_name } : { '@type': 'Organization', name: 'ADMA Digital' },
      publisher: { '@type': 'Organization', name: 'ADMA Digital' },
      datePublished: dateStr || undefined,
      mainEntityOfPage: `https://admadigital.co.zw/blog/${id}`,
    } : undefined,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  // Draft posts 404 for everyone except via the console (BlogManager fetches through
  // the same public endpoint, so this only affects someone landing on a stale/shared
  // link to an unpublished post).
  if (!post || (post.status || 'Draft') !== 'Published') {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-muted-foreground text-sm">Post not found.</p>
        <button onClick={() => navigate('/blog')} className="mt-3 text-amber text-sm underline">Back to blog</button>
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      <div className="px-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to blog
        </button>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {post.cover_image_url && (
          <img src={post.cover_image_url} alt="" className="w-full h-auto rounded-2xl border border-border" />
        )}

        <div className="bg-card border border-border rounded-2xl p-5">
          {post.category && (
            <span className="inline-block mb-2 text-[11px] bg-muted px-2 py-0.5 rounded font-medium text-muted-foreground">{post.category}</span>
          )}
          <h1 className="font-heading text-xl font-bold leading-tight">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
            {post.author_name && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {post.author_name}</span>}
            {dateStr && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtDate(dateStr)}</span>}
          </div>
        </div>

        {post.excerpt && (
          <p className="text-sm text-foreground/70 italic leading-relaxed">{post.excerpt}</p>
        )}

        {post.body ? (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{post.body}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Newspaper className="w-4 h-4" /> This post has no content yet.
          </div>
        )}
      </div>
    </div>
  );
}
