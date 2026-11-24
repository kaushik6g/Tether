# Circle privacy and account controls

| Action | What happens |
| --- | --- |
| Remove a friend | Both circle entries and outstanding taps between the two people are removed. Open chats close and their history remains readable. A new invitation can reconnect the pair. |
| Block someone | The same connection cleanup takes place. Invitations between the two people are unavailable while either person has an active block. |
| Unblock someone | Only the block you placed is removed. The two people can reconnect through a new invitation once neither has an active block. |
| Delete your account | After verifying your current password, Tether deletes your account and its profile, connections, invites, shared catch-up chats, and notification registrations. |

Open a friend's name from **Your circle** to remove or block them. Manage your blocked list and account from **Privacy**. Archived chats use a generic closed state and the blocked list is visible only to the person who created it.

Apply the privacy migrations after the earlier Supabase migrations. Deploy the web or mobile changes after the database supports the new endpoints.
