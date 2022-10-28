import {
  ButtonItem,
  definePlugin,
  PanelSection,
  PanelSectionRow,
  Router,
  ServerAPI,
  ServerResponse,
  staticClasses,
} from "decky-frontend-lib";
import { VFC } from "react";
import { FaShip } from "react-icons/fa";

import logo from "../assets/logo.png";

// interface AddMethodArgs {
//   left: number;
//   right: number;
// }

const Content: VFC<{ serverApi: ServerAPI }> = ({serverApi}) => {
  // const [result, setResult] = useState<number | undefined>();

  // const onClick = async () => {
  //   const result = await serverAPI.callPluginMethod<AddMethodArgs, number>(
  //     "add",
  //     {
  //       left: 2,
  //       right: 2,
  //     }
  //   );
  //   if (result.success) {
  //     setResult(result.result);
  //   }
  // };

  return (
    <PanelSection title="Panel Section">
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={(_e) => {
            serverApi.callPluginMethod<{}, {}>("get_playtimes", {}).then((response: ServerResponse<{}>) => {
              displayPlaytimes(response.result);
            });
          }}
        >
          Reload playtimes
        </ButtonItem>
      </PanelSectionRow>

      <PanelSectionRow>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img src={logo} />
        </div>
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => {
            Router.CloseSideMenus();
            Router.Navigate("/decky-plugin-test");
          }}
        >
          Router
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};

function displayPlaytimes(playtimes: {}) {
  console.log("NonSteamPlaytime playtimes", playtimes);
  Object.entries(playtimes).forEach(([key, value]) => {
    //@ts-ignore
    appStore.GetAppOverviewByGameID(key).minutes_playtime_forever = value / 60.0;
    console.log("NonSteamPlaytime", key, "played for", value, "seconds");
  });
}



export default definePlugin((serverApi: ServerAPI) => {
  //@ts-ignore
  let lifetimeHook = SteamClient.GameSessions.RegisterForAppLifetimeNotifications((update) => {
      console.log("NonSteamPlaytime AppLifetimeNotification", update);
      serverApi.callPluginMethod("on_lifetime_callback", {data: update}).then(_ => {
        serverApi.callPluginMethod<{}, {}>("get_playtimes", {}).then((response: ServerResponse<{}>) => {
          displayPlaytimes(response.result);
        });
      });
  });
  //@ts-ignore
  let startHook = SteamClient.Apps.RegisterForGameActionStart((actionType, id, action) => {
      console.log("NonSteamPlaytime GameActionStart", id);
      serverApi.callPluginMethod("on_game_start_callback", {idk: actionType, gameId: id, action: action});
  });

  serverApi.callPluginMethod<{}, {}>("get_playtimes", {}).then((response: ServerResponse<{}>) => {
    displayPlaytimes(response.result);
  });

  console.log("NonSteamPlaytime started");

  return {
    title: <div className={staticClasses.Title}>NonSteamPlaytime</div>,
    content: <Content serverApi={serverApi} />,
    icon: <FaShip />,
    onDismount() {
      lifetimeHook!.unregister();
      startHook!.unregister();
      console.log("NonSteamPlaytime ended");
    },
  };
});
