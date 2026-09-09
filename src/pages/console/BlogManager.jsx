import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BlogPost } from '@/api/entities';
import { Newspaper, Plus, Edit2, Trash2, Calendar, User, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BLOG_CATEGORIES } from '@/lib/blogConstants';
import ImageUploadOrUrlField from '@/components/shared/ImageUploadOrUrlField';

const EMPTY_POST = {
  title: '', author_name: '', category: BLOG_CATEGORIES[0], excerpt: '', body: '',
  cover_image_url: '', status: 'Draft', published_date: '',
};

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BlogManager() {
  const qc = useQueryClient();

  const { data: posts = [] } = useQuery({ queryKey: ['blog-posts'], queryFn: () => BlogPost.list('-created_date') });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_POST);
  const [deleteId, setDeleteId] = useState(null);

  const savePost = useMutation({
    mutationFn: (data) => editId ? BlogPost.update(editId, data) : BlogPost.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-posts'] }); setDialogOpen(false); },
  });
  const deletePost = useMutation({
    mutationFn: (id) => BlogPost.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-posts'] }); setDeleteId(null); },
  });

  const openCreate = () => { setEditId(null); setForm(EMPTY_POST); setDialogOpen(true); };
  const openEdit = (p) => {
    setEditId(p.id);
    setForm({
      title: p.title || '', author_name: p.author_name || '', category: p.category || BLOG_CATEGORIES[0],
      excerpt: p.excerpt || '', body: p.body || '', cover_image_url: p.cover_image_url || '',
      status: p.status || 'Draft', published_date: p.published_date || '',
    });
    setDialogOpen(true);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    // Stamp published_date the first time a post goes live, same idea as e.g. a CMS
    // auto-filling "date published" on publish rather than requiring it up front for
    // a Draft that might sit unpublished for weeks.
    const data = { ...form };
    if (data.status === 'Published' && !data.published_date) {
      data.published_date = new Date().toISOString().slice(0, 10);
    }
    savePost.mutate(data);
  };

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Blog</h1>
          <p className="text-muted-foreground text-sm mt-0.5 max-w-2xl">
            News, farming tips, exhibitor spotlights and event updates published at{' '}
            <a href="/blog" target="_blank" rel="noreferrer" className="text-amber hover:underline inline-flex items-center gap-1">/blog <ExternalLink className="w-3 h-3" /></a>.
            Posts stay hidden from the public page while Draft — switch a post to Published when it's ready.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> New Post</Button>
      </div>

      {posts.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-8 text-center">
          <Newspaper className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              {p.cover_image_url && (
                <img src={p.cover_image_url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{p.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'Published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.status || 'Draft'}
                  </span>
                </div>
                {p.category && <p className="text-xs text-amber font-medium mt-0.5">{p.category}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  {p.author_name && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {p.author_name}</span>}
                  {(p.published_date || p.created_date) && (
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDate(p.published_date || p.created_date)}</span>
                  )}
                  {p.status === 'Published' && (
                    <a href={`/blog/${p.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-amber">
                      <ExternalLink className="w-3 h-3" /> View live
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(p)}><Edit2 className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Post' : 'New Post'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Title *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BLOG_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Author</label>
                <Input value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))} placeholder="e.g. ADMA Digital Team" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Excerpt</label>
              <Textarea rows={2} value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} placeholder="Short summary shown in search results and social previews" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Body</label>
              <Textarea rows={8} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <ImageUploadOrUrlField
              label="Cover Image"
              value={form.cover_image_url}
              onChange={v => setForm(f => ({ ...f, cover_image_url: v }))}
              ownerId={editId || 'generic-blog-post'}
              purpose="blog"
              preset="flexible"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Published Date</label>
                <Input type="date" value={form.published_date} onChange={e => setForm(f => ({ ...f, published_date: e.target.value }))} placeholder="Auto-filled on publish" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savePost.isPending}>{savePost.isPending ? 'Saving…' : editId ? 'Save Changes' : 'Create Post'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Post</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This post will be permanently deleted.</p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deletePost.isPending} onClick={() => deletePost.mutate(deleteId)}>{deletePost.isPending ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
