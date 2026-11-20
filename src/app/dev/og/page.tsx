import { notFound } from "next/navigation";
import { Mark } from "@/components/brand";
import { TripTicket } from "@/components/trip-ticket";

/**
 * Source for public/og.png. Not a page for people: it exists so the social
 * preview image is rendered with the real fonts and the real ticket component.
 * Open it at 1200x630 in development and screenshot it (see README).
 * Returns 404 in production.
 */
export default function OgSource() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="relative flex h-[630px] w-[1200px] overflow-hidden bg-brand text-on-brand">
      <div className="flex w-[690px] flex-col justify-between p-16">
        <div className="flex items-center gap-3">
          <Mark className="h-11 w-11 text-on-brand" />
          <span className="font-heading text-3xl font-extrabold uppercase tracking-wide">Plan Karo Chalo</span>
        </div>
        <div>
          <p className="display text-[5.6rem]">Get the Goa plan out of the group chat.</p>
          <p className="mt-6 max-w-[30rem] text-2xl font-medium leading-snug">
            One link. Dates, place, commitment. No app, no sign-up for your friends.
          </p>
        </div>
      </div>
      <div className="relative flex-1">
        <div className="absolute right-12 top-12 w-[400px] rotate-[3deg]">
          <TripTicket
            cutout="var(--color-brand)"
            tripName="Goa, pakka this time"
            destination="Goa"
            destinationIcon="beach"
            dates="16 – 18 Jan"
            weekdays="Fri to Sun"
            days={3}
            budget="Up to ₹15K"
            pnr="K7X2"
            stamp="Confirmed"
            passengers={[
              { name: "Riya", status: "in" },
              { name: "Karthik", status: "in" },
              { name: "Meher", status: "in" },
              { name: "Zoya", status: "in" },
              { name: "Aanya", status: "in" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
