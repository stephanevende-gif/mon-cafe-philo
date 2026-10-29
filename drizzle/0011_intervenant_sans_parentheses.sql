-- « Yvon Quiniou (sur Marcel Conche) » est Yvon Quiniou : le nom d'un intervenant ne garde pas ce qui est entre parenthèses.
-- Les vidéos du doublon passent à l'intervenant déjà connu, puis le doublon disparaît.
UPDATE "videos" v SET "speaker_id" = keep."id"
FROM "speakers" dup, "speakers" keep
WHERE v."speaker_id" = dup."id" AND dup."full_name" ~ '\(' AND keep."id" <> dup."id"
  AND lower(keep."full_name") = lower(btrim(regexp_replace(dup."full_name", '\s*\([^)]*\)', '', 'g')));
--> statement-breakpoint
DELETE FROM "speakers" dup USING "speakers" keep
WHERE dup."full_name" ~ '\(' AND keep."id" <> dup."id"
  AND lower(keep."full_name") = lower(btrim(regexp_replace(dup."full_name", '\s*\([^)]*\)', '', 'g')));
--> statement-breakpoint
UPDATE "speakers" SET "full_name" = btrim(regexp_replace("full_name", '\s*\([^)]*\)', '', 'g')) WHERE "full_name" ~ '\(';
