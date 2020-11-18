import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";
import gql from 'graphql-tag';

import 'aframe';

const AFRAME = window.AFRAME;

AFRAME.registerComponent("yelpsearch", {
    schema: {
  
    },
    init: function() {

      this.cache = new InMemoryCache();
      this.searchUrl = new HttpLink({ uri: "/yelp_graphql/"});
      
      this.client = new ApolloClient({cache: this.cache, link: this.searchUrl});
    
      this.searchTerm = '';
      this.searchLocation = '';
    

      this.searchResponse = undefined;

      console.log("initializing yelp search");

      this.createSearchHeader();
      this.panelEl.setAttribute("visible", "false");

    },
    update: function(oldData) {
      
    },
    remove: function() {
  
    },
    tick: function() {
    },
    doSearch: async function(findDesc, findLoc) {
      console.log('Doing Search');

      this.searchTerm = findDesc;
      this.searchLocation = findLoc;
      this.panelEl.setAttribute("visible", "false");

      this.searchResults = await this.client
      .query({
        query: gql`
        query Search($term: String!, $location: String!) {
          search(term: $term, location: $location) {
            total
            business {
              name
              id
              alias
              rating
              url
              photos
              review_count
              coordinates {
                latitude
                longitude
              }
            }
          }
        }
        `,
        variables: { term: this.searchTerm, location: this.searchLocation},
      });

      const businessList = this.searchResults.data.search.business;
      console.log(businessList);

      console.log("GOT SEARCH RESPONE");

      this.findDescLabelEl.setAttribute("text", `value: ${this.searchTerm};`);
      this.findLocLabelEl.setAttribute("text", `value: ${this.searchLocation};`);
      this.panelEl.setAttribute("visible", "true");

      this.el.emit('yelp-search-response', {
        businessList: this.searchResults.data.search.business, 
        total: this.searchResults.data.search.total
      }, false);

    },
    createSearchHeader: function() {
  
      const findDescLabelEl = document.createElement('a-entity');
      findDescLabelEl.setAttribute("id", "find-desc-label");
      findDescLabelEl.setAttribute("position", "-0.2 0.1 -0.01");
      findDescLabelEl.setAttribute("rotation", "180 0 180");
      findDescLabelEl.setAttribute("scale", "2 2 2");
      findDescLabelEl.setAttribute("text", "value: tacos; color: #f00; wrapCount: 20;");
      this.findDescLabelEl = findDescLabelEl
  
      const findLocLabelEl = document.createElement('a-entity');
      findLocLabelEl.setAttribute("id", "find-loc-input");
      findLocLabelEl.setAttribute("position", "-0.2 -0.1 -0.01");
      findLocLabelEl.setAttribute("rotation", "180 0 180");
      findLocLabelEl.setAttribute("scale", "2 2 2");
      findLocLabelEl.setAttribute("text", "value: San Francisco, CA; color: #f00; wrapCount: 20;");
      this.findLocLabelEl = findLocLabelEl

      
      const panelEl = document.createElement('a-box');
      panelEl.setAttribute("rotation", "0 180 0");
      // panelEl.setAttribute("position", "0 -1 0");
      panelEl.setAttribute("width", "1.75");
      panelEl.setAttribute("height", "0.5");      
      panelEl.setAttribute("depth", "0.01");
      panelEl.setAttribute("scale", "2 2 2");
      panelEl.appendChild(findDescLabelEl);
      panelEl.appendChild(findLocLabelEl);

      this.panelEl = panelEl;
  
  
      // const panelContainer = document.createElement('a-entity');
      // panelContainer.setAttribute("position", "0 0 2");
      // panelContainer.appendChild(panelEl);
  
      this.el.appendChild(panelEl);
    }    
  });
