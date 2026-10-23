const TeamsService = {
  async getTeamsForLeague(league) {
    return [];
  },
  async warmAllLeagues() {},
  async searchTeams(query, leagueIds) {
    return [];
  }
};

if (typeof window !== "undefined") {
  window.TeamsService = TeamsService;
} else {
  self.TeamsService = TeamsService;
}