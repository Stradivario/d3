import { Module } from '@rxdi/core';

import { AppComponent } from './app.component';
import { D3Component } from './d3/d3.component';

@Module({
  components: [D3Component],
  bootstrap: [AppComponent],
})
export class AppModule {}
