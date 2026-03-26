const isNode = typeof window === 'undefined';
const storage = isNode ? new Map() : window.localStorage;

export const appParams = {
	appId: 'orato-local',
	token: 'local-dev-token',
	fromUrl: isNode ? '' : window.location.href,
	functionsVersion: 'local',
}
