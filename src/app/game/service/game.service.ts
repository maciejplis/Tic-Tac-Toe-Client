import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject, merge, Observable, ReplaySubject } from 'rxjs';
import { AuthenticationService } from 'src/app/shared/services/authentication.service';
import { over } from 'stompjs';
import * as SockJS from 'sockjs-client';

export interface GameData {
    board: string[][];

    players: {
      X: string,
      O: string
    };

    status: string;
    tour: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  
  private url: string = "http://localhost:8080";

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService,
    private router: Router,
    private cookieService: CookieService
  ) {}

  join(): Observable<{success: boolean, message: string}> {
    return this.http.post<{success: boolean, message: string}>(this.url + '/join', null, {headers: this.authHeader()});
  }

  leave(): Observable<{success: boolean, message: string}> {
    return this.http.post<{success: boolean, message: string}>(this.url + "/leave", null, {headers: this.authHeader()});
  }

  socket: any;
  client: any;
  wsEndpoint = "/tic-tac-toe";

  getGameData(): Observable<any> {
    this.socket = new SockJS(this.url + this.wsEndpoint);
    this.client = over( this.socket );

    return this.http.get<GameData>(this.url + '/game-data', {headers: this.authHeader()});
  }

  updateGameData(): Observable<any> {
    let gameDataUpdates: ReplaySubject<any> = new ReplaySubject(); 

    this.client.connect(
      {},
      (frame) => {
        this.client.subscribe("/topic/game", (message: {body: any}) => {
          const payload: any = JSON.parse(message.body);
          gameDataUpdates.next(payload);
        });
      },
      (error) => {
        console.log(error);
      }
    )

    return gameDataUpdates.asObservable();
  }

  mark(x: number, y: number) {
    return this.http.post(this.url + "/mark", {x, y}, {headers: this.authHeader()});
  }

  private authHeader(): {"Authorization": string} {
    return {"Authorization": this.cookieService.get("Authorization")};
  }
}