(function (_window) {
    var Popup = Base.extend({
        events: {
            'click .play-next': 'playNext',
            'click .play-prev': 'playPrev',
            'click .play-replay': 'replay',
            'click .play': 'playOrPause',
            'click .progress': 'changeTime',
            'click .volume-bar': 'changeVolume',
            'click .play-type': 'changeContentPlayType',
            'click .play-list': 'toggleSongList',
            'click .clickable': 'goPage',
            'click .one-player-song-list': 'handleSongList'
        },

        MUSIC_163_LINK: 'http://music.163.com/ ',
        SONG_LIST_HEIGHT: '300px',

        songNameEL: $('.song-name'),
        songImageEl: $('.song-pic'),
        singerNameEl: $('.singer-name'),
        playEL: $('.one-player-play-bar .play'),
        loadedEL: $('.progress-loaded'),
        bitRateEl: $('#bit-rate'),
        playedEL: $('.progress-played'),
        playType: $('.play-type'),
        timeEL: $('.play-time'),
        volumeEl: $('.current-volume'),
        songListEl: $('.one-player-song-list'),
        songLrcEl: $('.one-player-lrc'),
        songListLoadingEl: $('#loading-song-list'),

        playerInit: false,
        currentPageID:'',
        songInfo: null,
        backgroundPage: null,
        playing: false,

        afterInit: function () {
            this.backgroundPage = this.getBackgroundPage();
            this.refreshSongInfo();
            this.initPlayer();
            this.fillBitRate();
            this.getSongLrc();
            this.listenExtensionMessage();
        },
        initPlayer: function () {
            this.fillPlayerDOM();
        },
        listenExtensionMessage: function () {
            var self = this;
            chrome.extension.onMessage.addListener(function (msg) {
                self.refreshSongInfo();
                switch(msg){
                    case Events.INIT_PLAYER:
                        self.initPlayer();
                        self.getSongLrc();
                        break;
                    case  Events.SONG_CHANGE:
                        self.changeSong();
                        break;
                    case  Events.SONG_PROGRESS:
                        self.changeProgress();
                        self.changeLrcPosition();
                        break;
                    case  Events.SONG_PAUSE:
                        self.changePlayState();
                        break;
                    case Events.PLAY_TYPE_CHANGE:
                        self.changePlayType();
                        break;
                    case Events.RESET_PLAYER:
                        self.resetPlayer();
                        break;
                    case Events.RESPONSE_SONG_LIST:
                        self.fillSongList();
                        break;
                    case Events.BIT_RATE_CHANGE:
                        self.fillBitRate();
                        break;
                    case Events.RESPONSE_SONG_LRC:
                        self.fillSongLrc();
                        break;
                }
            })
        },
        changeSong: function () {
            this.fillPlayerDOM();
            this.selectSongInSongList();
            this.getSongLrc();
        },
        getSongLrc: function () {
            this.backgroundPage.getSongLrc();
        },
        selectSongInSongList: function () {
            var songEl = null;
            if(this.isSongListOpen()){
                songEl = this.songListEl.querySelector('li[data-id="' + this.songInfo.song_id +'"]');
                if(songEl&&!songEl.classList.contains('z-sel')){
                    songEl.click();
                }
            }
        },
        changeLrcPosition: function () {
            var seconds = this.getProgressInSeconds();
            var lrcItem = this.songLrcEl.querySelector('[data-time^="' + seconds +'"]');
            if(lrcItem){
                this.songLrcEl.style.transform = 'translate(0,-' + lrcItem.style.offsetY + 'px)'
            }
        },
        changeProgress: function () {
            this.fillProgressDOM();
        },
        changeVolume: function (e) {
            this.querySelector('.current-volume').style.width = e.offsetX + 'px';
            Popup.backgroundPage.changeVolume(e.offsetX/this.clientWidth);
        },
        changePlayType: function () {
            var icon = this.playType.querySelector('i');
            icon.className = '';
            icon.classList.add('icon-'+this.songInfo.play_type);
        },
        changePlayState: function () {
            if(this.songInfo.playing == this.playing)return;
            var addClass = this.songInfo.playing? 'icon-pause':'icon-play';
            var removeClass = this.songInfo.playing? 'icon-play':'icon-pause';
            this.playEL.classList.remove(removeClass);
            this.playEL.classList.add(addClass);
            this.playing = this.songInfo.playing;
        },
        toggleSongList: function () {
            if(!Popup.checkInit())return;
            var isSongListOpen = Popup.isSongListOpen();
            Popup.songListEl.style.height = isSongListOpen? 0 : Popup.SONG_LIST_HEIGHT;
            if(!isSongListOpen){
                Popup.backgroundPage.requestSongList();
            }
        },
        getProgressInSeconds: function(){
            var time = this.backgroundPage.songInfo.time.split('/')[0].split(':');
            var minutes = parseInt(time[0]);
            var seconds = parseInt(time[1]);
            return minutes * 60 + seconds;
        },
        checkInit: function () {
            return this.getBackgroundPage().playerInit;
        },
        getSongInfo: function () {
            return this.getBackgroundPage().songInfo;
        },
        getBackgroundPage: function () {
            return chrome.extension.getBackgroundPage().Background;
        },
        refreshSongInfo: function () {
            this.songInfo = this.getSongInfo();
        },
        resetPlayer: function () {
          this.fillPlayerDOM();
        },
        replay: function () {
            Popup.backgroundPage.changeTime(0);
        },
        changeTime: function (e) {
            Popup.backgroundPage.changeTime(e.offsetX/this.clientWidth);
        },
        handleSongList: function (e) {
            var target = e.target,
                liArray = null,
                currentLi = e.target.closest('li');
            e.preventDefault();
            if(Popup.isInSongList(target)){
                liArray = Array.prototype.slice.apply(document.getElementsByClassName('f-cb')[0].querySelectorAll('li'));
                liArray.forEach(function (li) {
                   if(li.classList.contains('z-sel')){
                       li.classList.remove('z-sel');
                   }
                });
                currentLi.classList.add('z-sel');
                Popup.scrollToCurrentSong();
                Popup.backgroundPage.clickSongListItem(currentLi.getAttribute('data-id'));
            }else if(target.classList.contains('f-tdu')){
                Popup.backgroundPage.goPage(target.getAttribute('href'));
            }
        },
        isSongListOpen: function () {
            return this.songListEl.clientHeight != 0;
        },
        isInSongList: function (el) {
          return  document.getElementsByClassName('f-cb')[0] && document.getElementsByClassName('f-cb')[0].contains(el);
        },
        scrollToCurrentSong: function () {
            var currentSongEl = this.songListEl.querySelector('.z-sel');
            if(currentSongEl&&(currentSongEl.offsetTop < this.songListEl.scrollTop || currentSongEl.offsetTop >= this.songListEl.scrollTop + this.songListEl.clientHeight - currentSongEl.clientHeight)){
                this.songListEl.scrollTop = currentSongEl.offsetTop;
            }
        },
        fillBitRate: function () {
            this.bitRateEl.innerHTML = this.backgroundPage.bitRate + 'K';
        },
        fillProgressDOM: function () {
            this.fillLoaded();
            this.fillPlayed();
            this.fillTime();
            this.fillVolume();
            this.changePlayState();
        },
        fillPlayerDOM: function () {
            this.fillSongName();
            this.fillSongImage();
            this.fillSingerName();
            this.fillLoaded();
            this.fillPlayed();
            this.fillTime();
            this.fillVolume();
            this.changePlayType();
            this.changePlayState();
        },
        fillSongList: function () {
            this.songListEl.innerHTML = this.backgroundPage.songList;
            this.scrollToCurrentSong();
        },
        fillSongLrc: function () {
            this.songLrcEl.innerHTML = this.backgroundPage.songLrc;
        },
        fillSongName: function () {
            this.songNameEL.innerHTML = this.songInfo.song_name;
            //todo 使用 this.sonNameEl 调用setAttribute会报 this.sonNameEl undefined错误
            $('.song-name').setAttribute('data-src','/song?id='+ this.songInfo.song_id);
        },
        fillSongImage: function () {
            $('.song-pic').setAttribute('data-src','/song?id='+ this.songInfo.song_id);
            this.songImageEl.querySelector('img').src = this.songInfo.song_img;
        },
        fillSingerName: function () {
            this.singerNameEl.innerHTML = this.songInfo.singer_name;
            $('.singer-name').setAttribute('data-src','/artist?id='+ this.songInfo.singer_id);
        },
        fillPlayed: function () {
            this.playedEL.style.width = this.songInfo.played;
        },
        fillLoaded: function () {
            this.loadedEL.style.width = this.songInfo.loaded;
        },
        fillTime: function(){
            this.timeEL.innerText = this.songInfo.time;
        },
        fillVolume: function () {
            console.log(this.songInfo.volume);
            $('.current-volume').style.width = this.songInfo.volume;
        },
        playNext: function(){
            Popup.backgroundPage.playNext();
        },
        playPrev: function(){
            Popup.backgroundPage.playPrev();
        },
        playOrPause: function(){
            Popup.backgroundPage.playOrPause();
        },
        changeContentPlayType: function(){
            Popup.backgroundPage.changeContentPlayType();
        },
        goPage: function(){
            Popup.backgroundPage.goPage(this.getAttribute('data-src'));
        }
    });
    Popup.init();
})(window);
