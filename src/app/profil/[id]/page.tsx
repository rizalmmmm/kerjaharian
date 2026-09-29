/* eslint-disable @next/next/no-img-element -- foto dilayani dari /api/foto */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { SocialLinks } from "@/components/social-links";
import { RatingBadge, Stars } from "@/components/stars";
import { VerifiedBadge } from "@/components/verified-badge";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProfile, listPhotos, listReviewsFor, ratingSummary } from "@/lib/profile";

async function load(params: Promise<{ id: string }>) {
  const id = Number((await params).id);
  const profile = Number.isInteger(id) ? await getPublicProfile(id) : null;
  if (!profile) notFound();
  return profile;
}

export async function generateMetadata(props: PageProps<"/profil/[id]">): Promise<Metadata> {
  const p = await load(props.params);
  return { title: `${p.name}${p.city ? ` — ${p.city}` : ""}`, description: p.bio.slice(0, 160) || undefined };
}

const bulanTahun = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z")));

export default async function ProfilePage(props: PageProps<"/profil/[id]">) {
  const profile = await load(props.params);
  const [rating, reviews, portfolio, me] = await Promise.all([
    ratingSummary(profile.id),
    listReviewsFor(profile.id),
    listPhotos(profile.id, "portfolio"),
    getCurrentUser(),
  ]);
  const isWorker = profile.role === "pekerja";

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      <section className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
        <Avatar name={profile.name} photoId={profile.avatar_id} size="lg" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold">{profile.name}</h1>
            {!!profile.email_verified && <VerifiedBadge label="Terverifikasi" />}
          </div>
          <p className="text-slate-600">
            {isWorker ? "Pekerja" : "Pemberi kerja"}
            {profile.city && ` · ${profile.city}`} · Bergabung {bulanTahun(profile.created_at)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <RatingBadge avg={rating.avg} count={rating.count} />
            <span className="text-sm text-slate-600">
              <strong>{profile.jobs_done}</strong> pekerjaan selesai
            </span>
          </div>
          {profile.bio && <p className="mt-4 whitespace-pre-line text-slate-700">{profile.bio}</p>}
          <div className="mt-4">
            <SocialLinks instagram={profile.instagram} facebook={profile.facebook} />
          </div>
          {me?.id === profile.id && (
            <Link href="/dasbor" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">
              ✏️ Ubah profil
            </Link>
          )}
        </div>
      </section>

      {portfolio.length > 0 && (
        <section className="card p-6">
          <h2 className="text-lg font-bold">{isWorker ? "Portofolio & hasil kerja" : "Foto usaha"}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {portfolio.map((p) => (
              <a key={p.id} href={`/api/foto/${p.id}`} target="_blank" className="block aspect-square overflow-hidden rounded-xl bg-slate-100">
                <img src={`/api/foto/${p.id}`} alt={`Portofolio ${profile.name}`} className="h-full w-full object-cover transition hover:scale-105" loading="lazy" />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="text-lg font-bold">Ulasan ({rating.count})</h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Belum ada ulasan.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {reviews.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/profil/${r.reviewer_id}`} className="font-semibold hover:text-brand-700">
                    {r.reviewer_name}
                  </Link>
                  <Stars value={r.rating} />
                </div>
                <p className="text-xs text-slate-500">{r.job_title}</p>
                {r.comment && <p className="mt-1 text-slate-700">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
