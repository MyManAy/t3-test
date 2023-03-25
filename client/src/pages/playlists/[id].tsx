import Head from "next/head";
import React from "react";
import BasicTable from "~/components/BasicTable";
import router, { useRouter } from "next/router";
import { Song } from "~/components/BasicTable";
import Spinner from "~/components/Spinner";
import BottomPlayer from "~/components/BottomPlayer";
import {
  fetchPlaylistData,
  convertDataToSongsFormat,
} from "~/utils/playlistsFunctions";
import { Howl } from "howler";

interface StaticProps {
  savedIds: string[];
}

const redirect = async () => {
  await router.push({ pathname: `/`, query: { auth_timed_out: true } });
};

const Home = ({ savedIds }: StaticProps) => {
  const router = useRouter();
  const playlistId = router.query["id"];
  const playlistName = router.query["playlist_name"];
  const playlistImgSrc = router.query["playlist_img_src"];
  const givenToken = router.query["token"];
  const [songs, setSongs] = useState(null as null | Song[]);
  const [howl, setHowl] = useState(null as null | Howl);
  const [currentSongId, setCurrentSongId] = useState(null as null | string);
  const [secsPlayed, setSecsPlayed] = useState(0);
  const [timer, setTimer] = useState(
    null as null | ReturnType<typeof setInterval>
  );

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

  const onSoundPlay = (sound: Howl) => {
    sound.on("play", () => {
      const interval = setInterval(() => {
        setSecsPlayed((secsPlayed) => secsPlayed + 1);
      }, 1000);
      setTimer(interval);
      sound.on("end", () => {
        setIsEnded(true);
      });
    });
  };

  const pause = () => {
    howl?.pause();
    clearInterval(timer as unknown as ReturnType<typeof setInterval>);
    setTimer(null);
  };

  const playPause = () => {
    if (howl?.playing()) {
      pause();
    } else {
      howl?.play();
    }
  };

  const handleSongSelect = (id: string) => {
    setCurrentSongId(id);
    if (currentSongId === id) {
      playPause();
    }
  };
  const handleSlide = (secs: number) => {
    if (secsPlayed === 0) return;
    setSecsPlayed(secs);
    howl?.seek(secs);
  };

  useEffect(() => {
    router.events.on("routeChangeStart", () => Howler.stop());
    return () => {
      router.events.off("routeChangeStart", () => Howler.stop());
    };
  }, [router]);
    if (router.isReady) {
      (async () => {
        const data = await fetchPlaylistData(
          playlistId as unknown as string,
          givenToken as unknown as string
        );
        const songs = convertDataToSongsFormat(data, savedIds);
        songsAvailableToDownload.current = true;
        setSongs(songs);
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

  useEffect(() => {
    if (howl) howl.stop();
    if (timer) clearInterval(timer);
    if (secsPlayed > 0) setSecsPlayed(0);
    const sound = new Howl({
      src: currentSongId ? `/songs/${currentSongId.trim()}.mp3` : `/songs/.mp3`,
    });
    onSoundPlay(sound);
    setHowl(sound);
    sound.play();
  }, [currentSongId]);


  const handleSongSelect = (id: string) => {
    setSrc(`/songs/${id}.mp3`);
  };

  return (
    <>
      <Head>
        <title>
          {findCurrentSong(songs, currentSongId?.trim())?.title ?? playlistName}
        </title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 pt-16 pb-24 ">
          <div className="flex flex-row items-center justify-center gap-6">
            <div className="h-60 w-60">
              <img src={playlistImgSrc as unknown as string}></img>
            </div>

            <h1 className="text-8xl font-bold tracking-tighter text-black">
              {playlistName}
            </h1>
          </div>

          {songs ? (
            <BasicTable
              songs={songs}
              onRowClick={handleSongSelect}
              currentlyPlayingSongId={currentSongId?.trim() ?? undefined}
            />
          ) : (
            <Spinner />
          )}
        </div>
          <MusicSlider
            secs={secsPlayed}
            length={howl?.duration() ?? 0}
            onChange={(secs) => handleSlide(secs)}
          />
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
