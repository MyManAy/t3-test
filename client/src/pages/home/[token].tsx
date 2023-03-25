import Head from "next/head";
import React from "react";
import { getSpotifyClient } from "~/utils/spotify";
import router, { useRouter } from "next/router";
import SelectPlaylist from "~/components/SelectPlaylist";
import Spinner from "~/components/Spinner";
import type { RootObject as GetPlaylistResponse } from "~/types/getPlaylistResponse";

const redirect = async () => {
  await router.push({ pathname: `/`, query: { auth_timed_out: true } });
};

const fetchPlaylistData = async (
  token: string
): Promise<GetPlaylistResponse> => {
  const fetchedClient = getSpotifyClient(token);
  const res = await fetchedClient.get(
    `https://api.spotify.com/v1/me/playlists`
  );
  return res.data as GetPlaylistResponse;
};

const handlePlaylistSelect = async (
  playlistId: string,
  token: string,
  playlistName: string,
  playlistImgSrc: string
) => {
  await router.push({
    pathname: `/playlists/${playlistId}`,
    query: {
      token: token,
      playlist_name: playlistName,
      playlist_img_src: playlistImgSrc,
    },
  });
};

const Home = () => {
  const router = useRouter();
  const givenToken = router.query["token"];
  const [playlistData, setPlaylistData] = React.useState(
    null as null | GetPlaylistResponse
  );

  React.useEffect(() => {
    if (router.isReady) {
      (async () => {
        const data = await fetchPlaylistData(givenToken as unknown as string);
        setPlaylistData(data);
      })().catch(() => {
        redirect().catch(() => console.log("uhh"));
      });
    }
  }, [router.isReady]);

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-6xl text-black">Hello World</h1>
          <div></div>
          {playlistData ? (
            <SelectPlaylist
              playlists={playlistData.items}
              onChange={(id, name, imgSrc) => {
                handlePlaylistSelect(
                  id,
                  givenToken as unknown as string,
                  name,
                  imgSrc
                ).catch(() => console.log("anotha one"));
              }}
            ></SelectPlaylist>
          ) : (
            <Spinner />
          )}
        </div>
      </main>
    </>
  );
};

export default Home;
