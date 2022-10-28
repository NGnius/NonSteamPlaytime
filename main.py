import pathlib
import os

import logging
import json
import asyncio
import time

HOME_DIR = str(pathlib.Path(os.getcwd()).parent.parent.resolve())
PARENT_DIR = str(pathlib.Path(__file__).parent.resolve())

LOG_PATH = "/tmp/non-steam-playtime.log"
SAVE_FOLDER = HOME_DIR + "/.config"
SAVE_PATH = SAVE_FOLDER + "/non-steam-playtimes.json"

logging.basicConfig(filename=LOG_PATH,
                    format='%(asctime)s %(levelname)s %(message)s',
                    filemode='w+',
                    force=True)
logger=logging.getLogger()
logger.setLevel(logging.DEBUG) # can be changed to logging.DEBUG for debugging issues

class RunningGame:
    def __init__(self, gameId: str):
        self.gameId = gameId
        self.start_time = time.time()

    def time_since_start(self):
        return time.time() - self.start_time

class Plugin:
    playtimes = None
    running_games = {} # maps instanceId to gameId
    last_started_game = None


    def startup(self):
        if os.path.exists(SAVE_PATH):
            try:
                with open(SAVE_PATH, "r") as save_data:
                    self.playtimes = json.load(save_data)
            except Exception as e:
                logger.error(f"Failed to load playtimes from {SAVE_PATH}: {e}")
                self.playtimes = {}
        else:
            self.playtimes = {}
        self.running_games = {}

    def save(self):
        if not os.path.exists(SAVE_PATH):
            os.makedirs(SAVE_FOLDER, exist_ok=True)
        with open(SAVE_PATH, "w") as save_data:
            json.dump(self.playtimes, indent=2)

    async def on_lifetime_callback(self, data):
        logger.debug("Handling lifetime notification")
        logger.debug(f"Data: {data}")
        instanceId = data["nInstanceID"]
        appId = data["unAppID"]
        if int(appId) != 0:
            logger.debug(f"Ignoring steam game {appId}")
            return
        if data["bRunning"]:
            if self.last_started_game is not None:
                self.running_games[instanceId] = RunningGame(self.last_started_game)
                logger.debug(f"Started playing {self.last_started_game}")
                self.last_started_game = None
            else:
                logger.warn(f"No last game running, cannot track {instanceId}")
        else:
            if instanceId in self.running_games:
                playtime = self.running_games[instanceId].time_since_start()
                gameId = str(self.running_games[instanceId].gameId)
                del(self.running_games[instanceId])
                if gameId in self.playtimes:
                    self.playtimes[gameId] += playtime
                else:
                    self.playtimes[gameId] = playtime
                logger.debug(f"Played {gameId} for {playtime}s")
                self.save(self)
            else:
                logger.warn(f"InstanceID {instanceId} not found in running games")

    async def on_game_start_callback(self, idk: int, gameId: str, action: str):
        logger.debug("Handling game start callback {idk} {gameId} {action}")
        self.last_started_game = gameId

    async def get_playtimes(self):
        while self.playtimes is None:
            await asyncio.sleep(0.1)
        return self.playtimes

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        self.startup(self)
        logger.info("Hello sweet world!")
    
    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self):
        self.save(self)
        logger.info("Goodbye cruel world!")
        pass
