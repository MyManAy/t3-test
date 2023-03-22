import Head from "next/head";
import React from "react";
import BasicTable from "~/components/BasicTable";
import { getAccessToken, getSpotifyClient } from "~/utils/spotify";
import router, { useRouter } from "next/router";
import { Root as PlaylistTracksResponse } from "~/server/api/types/getPlaylistTracksResponse";
import { Song } from "~/components/BasicTable";
import Spinner from "~/components/Spinner";

interface StaticProps {
  savedIds: string[];
}

const redirect = async () => {
  await router.push({ pathname: `/`, query: { auth_timed_out: true } });
};

const fetchPlaylistData = async (
  playlistId: string,
  token: string
): Promise<PlaylistTracksResponse> => {
  console.log(token);
  console.log(playlistId);
  const fetchedClient = getSpotifyClient(token);
  const res = await fetchedClient.get(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`
  );
  return res.data as PlaylistTracksResponse;
};

const Home = ({ savedIds }: StaticProps) => {
  const router = useRouter();
  const playlistId = router.query["id"];
  const playlistName = router.query["playlist_name"];
  const playlistImgSrc = router.query["playlist_img_src"];
  const givenToken = router.query["token"];
  const [songs, setSongs] = React.useState(null as null | Song[]);
  const songsAvailableToDownload = React.useRef(false);

  const convertDataToSongsFormat = (data: PlaylistTracksResponse): Song[] => {
    songsAvailableToDownload.current = true;
    return data.items.map((item) => {
      const track = item.track;
      return {
        cover: track.album.images[0]
          ? new URL(track.album.images[0].url)
          : null,
        title: track.name,
        artist: track.artists[0]?.name ?? "unknown",
        album: track.album.name,
        dateAdded: new Date(item.added_at),
        length_ms: track.duration_ms,
        mp3Loaded: savedIds.includes(track.id),
        id: track.id,
      };
    });
  };

  const downloadSongs = (songs: Song[]) => {
    const recentlyDownloaded = [] as string[];
    return songs.map((song) => async () => {
      if (savedIds.includes(song.id)) return;
      console.log("fetching: " + song.id);
      try {
        await fetch(`http://localhost:9999/${song.id}`);
      } catch {
        console.log("oops again");
      } finally {
        console.log(songs);
        setSongs(
          songs.map((currentSong) =>
            currentSong.id === song.id
              ? { ...song, mp3Loaded: true }
              : recentlyDownloaded.includes(currentSong.id)
              ? { ...currentSong, mp3Loaded: true }
              : currentSong
          )
        );
        recentlyDownloaded.push(song.id);
      }
    });
  };

  React.useEffect(() => {
    if (router.isReady) {
      (async () => {
        const data = await fetchPlaylistData(
          playlistId as unknown as string,
          givenToken as unknown as string
        );
        setSongs(convertDataToSongsFormat(data));
      })().catch((err) => {
        redirect().catch(() => console.log(err));
        // console.log(err);
      });
    }
  }, [router.isReady]);

  React.useEffect(() => {
    if (songsAvailableToDownload.current) {
      (async () => {
        songsAvailableToDownload.current = false;
        for (const download of downloadSongs(songs as unknown as Song[])) {
          try {
            await download();
          } catch {
            console.log("oops");
          }
        }
      })().catch((err) => {
        console.log(err);
      });
    }
  }, [songs]);

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <div className="flex flex-row items-center justify-center gap-6">
            <div className="h-60 w-60">
              <img src={playlistImgSrc as unknown as string}></img>
            </div>

            <h1 className="text-8xl font-bold tracking-tighter text-black">
              {playlistName}
            </h1>
          </div>

          {songs ? <BasicTable songs={songs} /> : <Spinner />}
        </div>
      </main>
    </>
  );
};

export async function getServerSideProps() {
  const res = await fetch("http://localhost:9999/getSavedIds");
  const ids = (await res.json()) as unknown as string[];

  return {
    props: {
      savedIds: ids,
    },
  };
}

export default Home;
