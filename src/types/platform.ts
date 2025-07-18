export type Platform = 'youtube' | 'rumble' | 'twitch' | 'kick';

export function getStreamUrl(platform: Platform, videoId: string): string {
  switch (platform) {
    case 'youtube':
      return `https://youtube.com/watch?v=${videoId}`;
    case 'rumble':
      return `https://rumble.com/embed/${videoId}`;
    case 'twitch':
      return `https://twitch.tv/${videoId}`;
    case 'kick':
      return `https://kick.com/${videoId}`;
    default:
      return '';
  }
}

export function getChannelUrl(platform: Platform, channelId: string): string {
  switch (platform) {
    case 'youtube':
      return `https://youtube.com/channel/${channelId}`;
    case 'rumble':
      return `https://rumble.com/c/${channelId}`;
    case 'twitch':
      return `https://twitch.tv/${channelId}`;
    case 'kick':
      return `https://kick.com/${channelId}`;
    default:
      return '';
  }
}
